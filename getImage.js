const {connection} = require("./mysqlConnection");
const puppeteer = require("puppeteer");
const {timeout} = require("./timeout");

const nano71 = {}
nano71.com = {
    list: [[], [], []],
    browser: null,
    browserWSEndpoint: null,
    page: null,
    demoUrl: ["https://item.taobao.com/item.htm?id=613861906903&ns=1&abbucket=3#detail", "https://detail.tmall.com/item.htm?id=673120529235&ns=1&abbucket=3", "https://item.jd.com/10034229127417.html"],
    init() {
        connection.query("select * from http_request.tmall", [], async (error, res) => {
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
                let first = true
                await this.page.goto(this.demoUrl[i])
                await timeout(5000)
                for (const item of this.list[i]) {
                    await this.updateData(item, i, first)
                    await timeout(2000)
                    first = false
                }
            }
            resolve()
        })
    },
    setTaobao(data, first) {
        data["specifications"] = JSON.parse(data["specifications"])
        return new Promise(async resolve => {
            await this.page.evaluate((data, first) => {
                let images = document.querySelectorAll(".tb-gallery img")
                for (let img of images) {
                    img.src = ""
                }
                let rows = _ => document.querySelectorAll(".J_TSaleProp.tb-clearfix")
                if (first) {
                    document.querySelector(".tb-gallery video").src = ""
                    document.querySelector("#J-From").remove()
                    document.querySelector(".vjs-control-bar").remove()
                }

                for (let item of data["specifications"]) {
                    const length = rows[0].querySelectorAll("li").length
                    if (length > 1) for (let i = 1; i < length; i++) {
                        rows[0].querySelector("li").remove()
                    }
                    rows[0].appendChild(rows[0].querySelector("li").cloneNode(true))
                    for (let item2 in item.prices) {

                    }
                }
                try {
                    document.querySelector(".vjs-center-poster").style.backgroundImage = `url(${data["face"]})`
                    let labels = document.querySelectorAll(".J_Prop.tb-prop.tb-clear")
                    labels[0].querySelector(".tb-property-type").innerText = data["specifications"][0]["from"]
                    labels[1].querySelector(".tb-property-type").innerText = data["specifications"][0]["prices"][0]["from"]
                    document.querySelector(".tb-main-title").innerText = data["title"]
                    document.querySelector("#J_SellCounter").innerText = data["sales"]
                } catch (e) {
                    console.log(e);
                }
            }, data, first)
            resolve()
        })
    },
    async updateData(data, i, first) {
        switch (i) {
            case 0:
                return this.setTaobao(data, first)
        }
    },
    getImage(data) {
        console.log(data["url"]);
    },
    async initPuppeteer() {
        console.log("浏览器初始化");
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
    }
}
nano71.com.init()
