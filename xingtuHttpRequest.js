const key = require("./keyInfo")
const fs = require('fs');
const xlsx = require('node-xlsx')
const puppeteer = require('puppeteer');
let browserWSEndpoint,
    browser,
    requestData = {
        url: "https://www.xingtu.cn/",
    },
    length = 0
const mysql = require("mysql");
let connection = mysql.createPool({
    host: "localhost",
    port: "3306",
    user: "root",
    password: "123456",
    database: "http_request",
    connectionLimit: "20" //设置连接池的数量
})
let path = "../../downloads/starMap/"

async function timeout(type, log) {
    return new Promise(resolve => {
        let randomTime = parseInt((Math.random() * 5000).toFixed(0));
        if (type && type !== "random") {
            randomTime = type
        }
        if (log === undefined) {
            console.log(randomTime, "毫秒延迟执行");
        }
        setTimeout(resolve, randomTime)
    })
}

async function init(url, first,) {
    if (first) {
        console.log("初始化");
        await puppeteer.launch({
            ignoreHTTPSErrors: true,
            headless: false,
            userDataDir: 'test-profile-dir',
            devtools: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-web-security",
                "--disable-features=IsolateOrigins,site-per-process",
            ],
        }).then(
            (Browser) => {
                browserWSEndpoint = Browser.wsEndpoint();
                console.log("节点已注册");
            }
        );
    }
    console.log("puppeteer已初始化");
    browser = await puppeteer.connect({browserWSEndpoint});
    console.log("浏览器已连接节点");
    const page = await browser.newPage();
    await page.evaluate(async () => {
        Object.defineProperty(navigator, 'webdriver', {get: () => false})
    })
    console.log("新标签页已创建");
    await page.setViewport({
        width: 1536,
        height: 816,
        deviceScaleFactor: 1,
    });

    await page.goto(url);
    await page.waitForSelector($.loginButton)
    await page.$eval($.loginButton, element => element.click())
    await page.waitForSelector($.emailLogin)
    await page.$eval($.emailLogin, element => element.click())
    await (await page.$($.emailInput)).type(key.get().account)
    await (await page.$($.passwordInput)).type(key.get().password)
    await page.$eval($.check, element => element.click())
    await page.$eval($.login, element => element.click())
    await page.waitForNavigation()
    await page.goto("https://www.xingtu.cn/ad/creator/hot")
    await page.mainFrame().addScriptTag({
        url: 'https://cdn.bootcss.com/jquery/3.2.0/jquery.min.js'
    })
    await timeout(5000)
    await page.evaluate((selector, selector2) => {
        window.$(selector).last().click()
        return null
    }, $.rankName)
    console.log("选择器已经点击");
    try {
        await timeout(3000)
        console.log("继续");
    } catch (e) {
        console.log(e);
    }
    await page.evaluate(() => {
        window.$("li > div:contains('头条')").remove()
        window.$("li > div:contains('西瓜')").remove()
        return null
    })
    await timeout(2000)
    let listItems = await page.$$("ul ul ul li")
    for (let i = 0; i < listItems.length; i++) {
        console.log("榜单", i);
        await listItems[i].click()
        await timeout(5000)
        let rankData = await page.evaluate((selector) => {
            let list = []
            let elements = document.querySelectorAll(selector)
            let images = document.querySelectorAll(selector + " img")
            // list.push(elements.length)
            elements.forEach((element, key) => {
                let cache = element.innerText.split("\t")
                let data = {
                    id: element.classList[0].replaceAll("star-", ""),
                    rank: cache[0],
                    name: cache[1].replaceAll("\n", ""),
                    avatar: images[key].getAttribute("src"),
                    fansCount: cache[2],
                    rating: cache[3],
                    type: cache[4],
                    playNumber: cache[5],
                    gpm: cache[6]
                }
                list.push(element.classList[0].replaceAll("star-", ""))
            }, $.listItem)
            return list
        }, $.listItem)
        console.log(rankData);
        for (let i = 0; i < rankData.length; i++) {
            await nextRequest(rankData[i])

        }
    }

}


async function nextRequest(id) {
    await exists(id)
    console.log(length);
    if (!length) {
        return new Promise(async resolve => {
            let url = "https://www.xingtu.cn/ad/creator/author/douyin/" + id + "/10"
            let page = await browser.newPage();
            await page.setViewport({
                width: 1536,
                height: 816,
                deviceScaleFactor: 1,
            });
            await page.goto(url)
            await page.mainFrame().addScriptTag({
                url: 'https://cdn.bootcss.com/jquery/3.2.0/jquery.min.js'
            })
            await timeout()
            await page.evaluate((selector) => {
                window.$(selector).last().click()
                return null
            }, $.downloadButton)
            await checkDownload(id)
            await page.close()
            await timeout()
            resolve()
        })
    } else {
        console.log("已存在");
    }
}

async function exists(ID) {
    console.log("ID", ID);
    return new Promise(resolve => {
        connection.query(
            "select * from starmap where starMapID = ?",
            [ID],
            async (err, result) => {
                length = result.length
                resolve();
            })
    })
}

async function checkDownload(id) {

    return new Promise(async resolve => {
        let isFinish = false;
        let fileList = [];
        let oldFileList = []
        const now = Date.now();
        fs.readdir(path, (err, files) => {
            if (err) {
                console.log('Error', err);
            } else {
                // console.log('Result', files);
                oldFileList = files
            }
        });
        while (!isFinish) {
            await timeout(1000);
            fs.readdir(path, (err, files) => {
                if (err) {
                    console.log('Error', err);
                } else {
                    // console.log('Result', files);
                    fileList = files
                }
            });
            // 如果有文件，且后缀满足我们的要求
            if (fileList !== oldFileList) {
                isFinish = true;
            }

            if (!isFinish && Date.now() - now >= 10 * 60 * 1000) {
                throw new Error("下载超时");
            }
        }
        // 记录一下耗时
        console.log("耗时", Date.now() - now);

        resolve()
    })

}

async function rename(name, id) {
    let file = fs.statSync(name)

}

let selector = {
    loginButton: ".el-dropdown-menu__item",
    emailLogin: "section.login-tab>.tab-item:nth-child(2)",
    emailInput: "input[name='email']",
    passwordInput: "input[name='password']",
    login: "button.account-center-action-button",
    check: ".account-center-agreement-check",
    rankName: "li:contains('达人指数榜')",
    rankList: ["li:contains('带货榜')", "li:contains('涨粉黑马榜单')", "li:contains('带货榜')"],
    pane: ".platform-1",
    list: "div.platform-1  table.hot-star-table:nth-child(2)",
    listItem: "div.platform-1  table.hot-star-table:nth-child(2) > tbody > tr",
    downloadButton: "button:contains('导出数据')",
}
let $ = selector
init(requestData.url, true).then(res => console.log("结束"))
