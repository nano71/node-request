const axios = require("axios");
const {randomID} = require("./randomID");
const {getType} = require("./getType");
const {timeout} = require("./timeout");
const {connection, exists} = require("./mysqlConnection");
const md5 = require("md5");
const puppeteer = require("puppeteer");
const {selector} = require("./selector");
const type = 1
let request = {
    browser: null,
    browserWSEndpoint: null,
    baseUrl: "http://162.14.108.171:10006",
    async start(start = 1, max) {
        for (let i = start; i < max; i++) {
            await request.get(i)
        }
    },
    async get(page = 1, list) {
        let date = new Date()
        list || await this.getList(page).then(res => list = res)
        for (let item of list) {
            let hasExists = false
            await exists(item["wareid"] || item, type).then(res => hasExists = res)
            if (hasExists) {
                if (!item["wareid"] || !item) {
                    console.log(item);
                }
                console.log("数据已存在", item["wareid"] || item)
                continue
            }
            let data = {
                id: randomID(),
                type: getType(type),
                url: "//item.jd.com/" + (item["wareid"] || item) + ".html",
                uniqueID: item["wareid"] || item,
                keyword: "柚子",
                title: null,
                time: this.getDate(date),
                platform: "京东",
                shop: null,
                originCountry: "",
                originProvince: "",
                originAddress: "",
                variety: null,
                specifications: [],
                sales: null,
                face: null,
                md5: null,
                baseInformation: null
            }
            let getDetail = async _ => await this.getJdDetail(data).then(async res => {
                res || (console.log("正在重试", data.uniqueID), await timeout(5000), await getDetail())
                res && (await this.insert(res))
            })
            await getDetail()
            await timeout(2000)
        }
    },
    async getUrls() {
        console.log("开始");
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
        const page = await this.browser.newPage();
        await page.setViewport({
            width: 1600,
            height: 900,
            deviceScaleFactor: 1,
        });
        await page.goto("https://search.jd.com/Search", {timeout: 10000});
        // await page.waitForNavigation()
        await page.focus(selector.jd.search);
        await page.keyboard.press('Backspace');
        await page.keyboard.press('Backspace');
        await page.keyboard.type("柚子", {delay: 100});
        await page.keyboard.press('Enter');
        await page.waitForNavigation()
        await timeout(2000)
        await page.$eval(".f-sort a:nth-child(2)", element => {
            element.click()
        })
        await timeout(2000)
        let urls = await page.$$eval(
            selector.jd.urls,
            element => {
                let urls = []
                for (let i = 0; i < element.length; i++) {
                    urls.push(element[i].getAttribute("href"))
                }
                return urls;
            }
        )
        for (let i in urls) {
            urls[i] = urls[i].replace("//item.jd.com/", "").replace(".html", "")
        }
        console.log(urls);
        await this.get(0, urls)
        await (await page.$(selector.jd.nextUrl)).click()
        await timeout(3000)
        for (let i = 0; i < 100; i++) {
            urls = await page.$$eval(
                selector.jd.urls,
                element => {
                    let urls = []
                    for (let i = 0; i < element.length; i++) {
                        urls.push(element[i].getAttribute("href"))
                    }
                    return urls;
                }
            )
            for (let i in urls) {
                urls[i] = urls[i].replace("//item.jd.com/", "").replace(".html", "")
            }
            await this.get(0, urls)
            await timeout(3000)
            await (await page.$(selector.jd.nextUrl)).click()
            await timeout(3000)
        }
    },
    insert({
               id,
               uniqueID,
               type,
               keyword,
               title,
               time,
               platform,
               url,
               shop,
               originCountry,
               originProvince,
               originAddress,
               variety,
               specifications,
               sales,
               face,
               baseInformation
           }) {
        if (!specifications) {
            return console.log("无价格表,跳过", uniqueID)
        }
        return new Promise(async (resolve) => {
            console.log("开始添加");
            await connection.query(
                `INSERT INTO tmall (id,
                                        uniqueID,
                                        type,
                                        keyword,
                                        title,
                                        time,
                                        platform,
                                        url,
                                        shop,
                                        originCountry,
                                        originProvince,
                                        originAddress,
                                        variety,
                                        specifications,
                                        sales,
                                        face,
                                        md5,
                   ext
                   )
                     VALUES ('${id}',
                             '${uniqueID}',
                             '${type}',
                             '${keyword}',
                             '${title}',
                             '${time}',
                             '${platform}',
                             '${"https:" + url}',
                             '${shop}',
                             '${originCountry}',
                             '${originProvince}',
                             '${originAddress}',
                             '${variety}',
                             '${specifications}',
                             '${sales}',
                             '${"https:" + face}',
                             '${md5(specifications || "1")}',
                             '${baseInformation || ""}'
                             );`.replaceAll("\n", ""),
                (err, result) => {
                    if (err) {
                        throw err;
                    }
                    resolve();
                }
            );
        })
    },
    getDate(date) {
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:00`
    },
    getJdDetail(data) {
        const url = this.baseUrl + "/jd.get.item?token=bba230047f08154bbecb5a066b0228f3&itemid=" + data.uniqueID
        return new Promise(resolve => {
            axios.get(url).then(res => {
                let detail, item
                try {
                    detail = res.data.data
                    item = detail["item"]
                } catch (e) {
                    console.log(res.data);
                    return resolve(false)
                }
                try {
                    data.shop = detail["stock"]["D"]["vender"]
                } catch (e) {
                    console.log(e);
                    console.log(data);
                }
                data.title = detail["skuName"]
                data.sales = detail["CommentsCount"][0]?.["CommentCountStr"]
                data.face = detail["image"]
                if (item["expandAttrDesc"]) {
                    let cache = this.getVariety(item["expandAttrDesc"])
                    data.originCountry = cache[0]
                    data.originProvince = cache[1]
                    data.originAddress = cache[2]
                    data.variety = cache[3]
                    data.baseInformation = JSON.stringify(item["expandAttrDesc"])
                }
                data.specifications = this.parseSpecifications(detail)
                console.log(data.specifications);
                return resolve(data)
            }).catch(e => {
                console.log(e);
                return resolve(false)
            })
        })
    },
    parseSpecifications(detail) {
        let list = detail["item"]["newColorSize"]
        let cache = []
        let props = detail["item"]["saleProp"]
        for (let item of list) {
            if (item["2"]) {
                cache.push({
                    label: `${props["1"]}: ${item["1"]}; ${props["2"]}: ${item["2"]}`,
                    price: this.getPrice(item["skuId"], detail)
                })
            } else {
                cache.push({
                    label: props["1"] + ": " + item["1"],
                    price: this.getPrice(item["skuId"], detail)
                })
            }
        }

        return JSON.stringify(cache)
    },
    getPrice(id, detail) {
        let prices = detail["skus"]
        for (let item of prices) {
            if (item["id"] === "J_" + id) {
                return item["p"]
            }
        }
    },
    getVariety(object) {
        console.log(object);
        let data = {}
        for (let key in object) {
            data.originCountry || (data.originCountry = (key === "产地" && object[key][0]) || (key === "原产地" && object[key][0]) || (key === "商品产地" && object[key][0]) || (key === "原" && object[key][0]) || "")
            data.originProvince || (data.originProvince = (key === "省份" && object[key][0]) || "")
            data.originAddress || (data.originAddress = (key === "城市" && object[key][0]) || "")
            data.variety || (data.variety = (key === "特产品类" && object[key][0]) || (key === "水果种类" && object[key][0]) || (key === "品种" && object[key][0]) || (key === "种类" && object[key][0]) || "")
        }
        console.log([data.originCountry, data.originProvince, data.originAddress, data.variety]);
        return [data.originCountry, data.originProvince, data.originAddress, data.variety]
    },
    getList(page) {
        console.log("第" + page + "页");
        const url = this.baseUrl + "/jd.search?token=bba230047f08154bbecb5a066b0228f3&sort=_sale&q=%E6%9F%9A%E5%AD%90&page=" + page
        console.log(url);
        return new Promise(resolve => {
            axios.get(url).then(res => {
                return resolve(res.data.data["searchm"]["Paragraph"])
            })
        })
    }
}

// request.start(1, 100)
request.getUrls()
