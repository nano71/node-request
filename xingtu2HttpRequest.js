const puppeteer = require("puppeteer");
const {timeout} = require("./timeout");
const {pageScroll} = require("./pageScroll");
const {connection} = require("./mysqlConnection");
const {toBase64} = require("./base64");

let list, browser, browserWSEndpoint
connection.query("select * from starmap where realID is null", [], async (err, result) => {
    if (err) throw err
    list = JSON.parse(JSON.stringify(result))
    request().then(r => console.log("结束"))
})


async function request() {
    let baseUrl = "https://www.xingtu.cn/mobile/ad/author/"
    console.log("开始");
    await puppeteer.launch({
        ignoreHTTPSErrors: true,
        headless: false,
        userDataDir: "test-profile-dir",
        devtools: false,
        dumpio: true,
        ignoreDefaultArgs:['--enable-automation'],
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security", "--disable-features=IsolateOrigins,site-per-process",],
    }).then((Browser) => {
        browserWSEndpoint = Browser.wsEndpoint();
        console.log("节点已注册");
    });
    console.log("puppeteer已注册");
    browser = await puppeteer.connect({browserWSEndpoint});
    console.log("浏览器已连接");

    for (let i = 0; i < list.length; i++) {
        console.time('timer')
        let id = list[i].starMapID
        console.log(id);
        await nextRequest(baseUrl + id + "/1/1", id)
        console.timeEnd("timer")
        console.log(list.length, "/", i + 1);
        console.log("进度:", ((i + 1) / list.length) * 100, "%");
    }
}

async function nextRequest(url, id) {
    return new Promise(async resolve => {
        let $ = {
            id: ".douyin-address-info",
            information: ".author-intro div span",
            avatar: ".avatar-image img",
            "7daysAvgPlayCount": ".statistic-tip"
        }
        const page = await browser.newPage();
        await page.evaluateOnNewDocument(() =>{ Object.defineProperties(navigator,{ webdriver:{ get: () => false } }) })
        await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1');
        await page.setViewport({width: 375, height: 812});
        await page.goto(url)
        await timeout()
        await page.waitForSelector($.id)
        let data = {
            realID: 0, avatar: "", avgPlayCount: "", information: "", fullPlayIndex: 0.0, "7daysAvgPlayCount": 0
        }
        await pageScroll(page)
        data.realID = await page.$eval($.id, element => {
            return element.innerText.replaceAll("抖音号：", "").split(" ")[0].trim()
        })

        let info = await page.$($.information)
        if (info) {
            data.information = await page.$eval($.information, element => {
                return element.innerText.replaceAll("\n", "")
            })
        }
        await page.waitForSelector($.avatar)
        data.avatar = await page.$eval($.avatar, element => {
            return element.getAttribute("src")
        })
        await page.waitForSelector(".video-stat-value")
        let playInfo = await page.$$eval(".video-stat-value", elements => {
            let list = []
            elements.forEach(element => {
                list.push(element.innerText.replace("%", "").replaceAll("w", "0000"))
            })
            return list
        })
        data.fullPlayIndex = playInfo[0].replace("-", "") || 0.0
        data.avgPlayCount = playInfo[2] || 0
        let tip = await page.$($["7daysAvgPlayCount"]) || 0
        if (tip) {
            data["7daysAvgPlayCount"] = await page.$eval($["7daysAvgPlayCount"], element => {
                return element.innerText.replace("最近7个视频的平均播放量为", "").trim().replaceAll("w", "0000")
            })
        }

        console.log(data);
        connection.query(`UPDATE http_request.starmap t
                          SET t.realID            = ${data.realID}, 
                              t.information       = '${toBase64(data.information)}',
                              t.avatar            = '${data.avatar}',
                              t.fullPlayIndex     = ${data.fullPlayIndex},
                              t.avgPlayCount      = ${data.avgPlayCount},
                              t.7daysAvgPlayCount = ${data["7daysAvgPlayCount"]}
                          WHERE t.starMapID = ${id} ;`.replaceAll(/\n/g, ""), [],
            async (err, result) => {
                if (err) throw err
                console.log(result);
                page.close()
                resolve()
            })
    })
}



