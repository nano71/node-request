const fs = require("fs");
const xlsx = require('node-xlsx')
const axios = require("axios");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const {connection} = require("../mysql/mysqlConnection");
const {timeout} = require("../utils/timeout");

let nano71 = {
    data: [],
    page: null,
    selector: {
        image: {
            neteasy: "#product_pix > ul > li:nth-child(2) > img",
            tmall: "img#J_ImgBooth"
        }
    },
    async init() {
        this.readXlsx()
        await this.initPuppeteer()
        await this.loopData()
    },
    async loopData() {
        for (let i = 0; i < this.data.length; i++) {
            let item = this.data[i];
            await this.exists(item.url, item.size).then(async r => {
                if (!r) {
                    await this.getImage(item.url, i)
                    await this.insert(this.data[i])
                } else {
                    console.log("已存在");
                }
            })
        }
    },
    async initPuppeteer() {
        return new Promise(async resolve => {
            await puppeteer.launch({
                ignoreHTTPSErrors: true,
                headless: false,
                userDataDir: "test-profile-dir",
                devtools: false,
                dumpio: true,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-web-security",
                    "--disable-features=IsolateOrigins,site-per-process",
                    '--disable-automation'
                ],
                ignoreDefaultArgs: ['--enable-automation']
            }).then(
                (Browser) => {
                    this.browserWSEndpoint = Browser.wsEndpoint();
                    console.log("节点已注册");
                }
            );
            console.log("puppeteer已注册");
            this.browser = await puppeteer.connect({browserWSEndpoint: this.browserWSEndpoint});
            console.log("浏览器已连接");
            this.page = await this.browser.newPage();
            await this.page.setViewport({
                width: 1600,
                height: 900,
                deviceScaleFactor: 1,
            });
            resolve()
        })
    },
    async getImage(url, i) {
        if (url.includes("163.com")) {
            return this.getNeteasyImage(url, i)
        } else {
            return this.getTmallImage(url, i)
        }
    },
    getTmallImage(url, i) {
        if (i && url === this.data[i - 1].url) {
            return this.data[i].coverImage = this.data[i - 1].coverImage
        }
        return new Promise(async resolve => {
                try {
                    await this.page.goto(url)
                    await this.page.waitForSelector(this.selector.image.tmall)
                } catch (e) {
                    await this.page.reload(url);
                }
                await timeout(2000)
                try {
                    this.data[i].coverImage = await this.page.$eval(this.selector.image.tmall, element => {
                        return element.src
                    })
                } catch (e) {
                    this.data[i].coverImage = "无法获取"
                }
                resolve()
            }
        )
    },
    getNeteasyImage(url, i) {
        if (i && url === this.data[i - 1].url) {
            return this.data[i].coverImage = this.data[i - 1].coverImage
        }
        return new Promise(resolve => {
            console.log(url);
            axios.get(url).then(async res => {
                let $ = cheerio.load(res.data);
                try {
                    this.data[i].coverImage = $(this.selector.image.neteasy)[0].attribs.src
                } catch (e) {
                    this.data[i].coverImage = "无法获取"
                }
                console.log(this.data[i]);
                resolve()
            }).catch(r => {
                this.data[i].coverImage = "无法获取"
                resolve()
            })
        })
    },
    readXlsx() {
        let parsePath = "./库存清理0714.xlsx"
        let sheetList = xlsx.parse(parsePath);
        for (const sheet of sheetList) {
            for (let i = 1; i < sheet.data.length; i++) {
                let row = sheet.data[i]
                this.data.push({
                    id: row[0],
                    name: row[1],
                    size: row[2],
                    url: row[3],
                    price: row[4],
                    count: row[5]
                })
            }
        }
    },
    exists(url, size) {
        return new Promise(resolve => {
            connection.query("select * from neteasy_commodity where url = ? and size = ? and coverImage is not null ", [url, size], (error, result) => {
                if (error) {
                    throw new Error(error)
                }
                resolve(result.length)
            })
        })
    },
    insert(object) {
        return new Promise(resolve => {
            let sql = "INSERT INTO http_request.neteasy_commodity (" + Object.keys(object).toString().replaceAll("'", "")
                + ") VALUES ('" + Object.values(object).join("','") + "');"
            // console.log(sql);
            connection.query(sql,
                [],
                (error, result) => {
                    if (error) {
                        // console.log(object)
                        throw new Error(error)
                    }
                    resolve(result)
                }
            )
        })
    }
}
nano71.init()
