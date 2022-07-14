const {connection} = require("../mysql/mysqlConnection");
const puppeteer = require("puppeteer");
const {timeout} = require("../utils/timeout");
const fs = require("fs");
const {getType} = require("../utils/getType");
const {selector} = require("./selector");
const type = 1
const nano71 = {}
nano71.com = {
    platform: "tb",
    list: [[], [], []],
    browser: null,
    browserWSEndpoint: null,
    page: null,
    demoUrl: ["https://item.taobao.com/item.htm?id=613861906903&ns=1&abbucket=3#detail", "https://detail.tmall.com/item.htm?id=673120529235&ns=1&abbucket=3", "https://item.jd.com/10034229127417.html"],
    init(platform) {
        this.platform = platform
        connection.query("select * from http_request.pomelo", [], async (error, res) => {
            // this.list = res
            for (let item of res) {
                const url = item["url"]
                if (url.includes("taobao.com")) {
                    this.list[0].push(item)
                } else if (url.includes("tmall.com")) {
                    this.list[1].push(item)
                } else if (url.includes("jd.com")) {
                    this.list[2].push(item)
                }
            }
            await this.initPuppeteer()
            await this.start()
            console.log("完成")
        })
    },
    start() {
        return new Promise(async resolve => {
            for (let i = 0; i < this.list.length; i++) {
                if (this.platform) {
                    if (this.platform === "jd") {
                        i = 2
                    }
                    if (this.platform === "tm") {
                        i = 1
                    }
                }
                let first = true
                await this.page.goto(this.demoUrl[i])
                await timeout(5000)
                for (const item of this.list[i]) {
                    await this.updateData(item, i, first)
                    first = false
                }
            }
            resolve()
        })
    },
    parseSpecifications(data) {
        let cache = [], froms = []
        for (let item of data) {
            let cacheObject = {
                from: item.label.split("; ")[0].split(": ")[0],
                label: item.label.split("; ")[0].split(": ")[1],
                prices: []
            }
            if (!froms.includes(cacheObject.label)) {
                froms.push(cacheObject.label)
                cache.push(cacheObject)
            }
            cache.at(-1).prices.push({
                from: item.label.split("; ")[1].split(": ")[0],
                label: item.label.split("; ")[1].split(": ")[1],
                price: item.price || item.prices
            })
        }
        console.log(cache[0]);
        return cache
    },
    setTaobao(data, first) {
        return new Promise(async resolve => {
                await this.page.evaluate((data, first) => {
                    let images = document.querySelector(".tb-item-info-l").querySelectorAll("img")
                    for (let img of images) {
                        img.src = ""
                    }
                    if (first) {
                        document.querySelector(".tb-gallery video").src = ""
                        document.querySelector("#J-From").remove()
                        document.querySelector(".vjs-control-bar").remove()
                    }
                })

                let folderName = "./images/" + "tb" + getType(type) + data.uniqueID
                if (fs.existsSync(folderName)) {
                    console.log("截图已经存在");
                    return resolve()
                }
                await this.page.evaluate((data, first) => {
                    let labels = document.querySelectorAll(".J_Prop.tb-prop.tb-clear")
                    // labels[0].querySelector(".tb-property-type").innerText = data["specifications"][0]["from"]
                    // labels[1].querySelector(".tb-property-type").innerText = data["specifications"][0]["prices"][0]["from"]
                    document.querySelector(".tb-main-title").innerText = data["title"]
                    document.querySelector("#J_SellCounter").innerText = data["sales"]
                    document.querySelector(".vjs-center-poster").style.backgroundImage = `url(${data["face"]})`
                }, data, first)
                data["specifications"] = this.parseSpecifications(JSON.parse(data["specifications"]))
                await this.page.$$eval(".J_TSaleProp.tb-clearfix", (elements) => {
                    elements[0].innerHTML = ""
                    elements[1].innerHTML = ""
                })
                let max = 0, min = 10000
                let hasPrices = []
                for (let item of data["specifications"]) {
                    await this.page.$eval(".J_TSaleProp.tb-clearfix", (element, label) => {
                        let node = document.createElement("li")
                        let a = document.createElement("a")
                        a.innerText = label.toString()
                        node.appendChild(a)
                        element.appendChild(node)
                    }, item.label)
                    for (let item2 of item.prices) {
                        if (hasPrices.includes(item2.label)) {
                            continue
                        }
                        hasPrices.push(item2.label)
                        if (item2.price < min) {
                            min = item2.price
                        }
                        if (item2.price > max) {
                            max = item2.price
                        }
                        await this.page.$$eval(".J_TSaleProp.tb-clearfix", (elements, label) => {
                            let node = document.createElement("li")
                            let a = document.createElement("a")
                            a.innerText = label.toString()
                            node.appendChild(a)
                            elements[1].appendChild(node)
                        }, item2.label)
                        await this.page.$eval(".tb-rmb-num", (element, number) => {
                            element.innerText = number
                        }, (max * 1.5).toFixed(2) + "-" + (min * 1.5).toFixed(2))
                        await this.page.$eval("#J_PromoPriceNum", (element, number) => {
                            element.innerText = number
                        }, max + "-" + min)
                    }
                }
                await this.getImage(data["uniqueID"], "tb")
                await timeout(2000)
                resolve()
            }
        )
    },
    async updateData(data, i, first) {
        data.face = data.face.replace("https", "http")
        switch (i) {
            case 0:
                return this.getTb(data)

            // return this.setTaobao(data, first)
            case 1:
                return this.getTb(data)
            case 2:
                return this.getJd(data)
        }
    },
    getTb(data) {
        let folderName = "./images/" + "tb" + getType(type) + data.uniqueID
        if (fs.existsSync(folderName)) {
            console.log("截图已经存在", data.uniqueID);
            return
        }
        return new Promise(async resolve => {
            try {
                await this.page.goto(`https://item.taobao.com/item.htm?spm=a230r.1.14.25.13761b01sh2LYD&ns=1&abbucket=0&${data.uniqueID}#detail&id=`, {timeout: 5000})
                await timeout(5000)
                let error = await this.page.$(".baxia-dialog")
                if (error) {
                    await this.page.$eval(".baxia-dialog", element => {
                        element.remove()
                    })
                }
                await this.getImage(data.uniqueID, "tb")
            } catch (e) {
                await this.getImage(data.uniqueID, "tb")
            }
            resolve()
        })
    },
    getJd(data) {
        let folderName = "./images/" + "jd" + getType(type) + data.uniqueID
        if (fs.existsSync(folderName)) {
            console.log("截图已经存在", data.uniqueID);
            return
        }
        return new Promise(async resolve => {
            try {
                await this.page.goto(`https://item.jd.com/${data.uniqueID}.html`)
                await this.page.waitFor({timeout: 5000})
                await this.getImage(data.uniqueID, "jd")
            } catch (e) {
                await this.getImage(data.uniqueID, "jd")
            }
            resolve()
        })
    },
    async getImage(id, platform) {
        return new Promise(async resolve => {
            let folderName = "./images/" + platform + getType(type) + id
            if (!fs.existsSync(folderName)) {
                console.log("创建文件夹");
                fs.mkdirSync(folderName);
            } else {
                console.log("截图已经存在", id);
                return resolve()
            }
            try {
                let s = "taobao"
                if (platform === "jd") {
                    s = "jd"
                }
                let detail = await this.page.$(selector[s].detail.area);
                detail && await detail.screenshot({
                    path: folderName + "/detail.png"
                });
                console.log("截图成功", id);
            } catch (e) {
                console.log("截图失败", e);
            }
            resolve()
        })

    },
    async initPuppeteer() {
        console.log("浏览器初始化");
        await puppeteer.launch({
            ignoreHTTPSErrors: true,
            headless: false,
            userDataDir: "test-profile-dir01",
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
    }
}
nano71.com.init("tb")
