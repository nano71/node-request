const {connection} = require("./mysqlConnection");
const puppeteer = require('puppeteer');
const {timeout} = require("./timeout");
const {parseUrl} = require("./parseUrl");
const {pageScroll} = require("./pageScroll");
const {toBase64} = require("./base64");
let list,
    browser,
    browserWSEndpoint,
    baseUrl = "https://www.douyin.com/search/",
    params = "?source=switch_tab&type=user"
connection.query("select * from starmap where realID is not null and videos is null ", [], async (err, result) => {
    if (err) throw err
    list = JSON.parse(JSON.stringify(result))
    request().then(r => console.log("结束"))
})


async function request() {
    console.log("开始");
    await puppeteer.launch({
        ignoreHTTPSErrors: true,
        headless: false,
        userDataDir: "test-profile-dir4",
        devtools: false,
        dumpio: true,
        args: ["--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-web-security",
            "--disable-features=IsolateOrigins,site-per-process",
        ],
    }).then((Browser) => {
        browserWSEndpoint = Browser.wsEndpoint();
        console.log("节点已注册");
    });
    console.log("puppeteer已注册");
    browser = await puppeteer.connect({browserWSEndpoint});
    console.log("浏览器已连接");
    for (let i = 0; i < list.length; i++) {
        console.time("timer")
        let id = list[i].realID
        await nextRequest(id, list[i])
        console.timeEnd()
    }
}

async function nextRequest(id, info) {
    console.log(id);
    let url = baseUrl + id + params, detailUrl
    const page = await browser.newPage();
    await page.setViewport({
        width: 1600,
        height: 900,
        deviceScaleFactor: 1,
    });

    async function getDetailUrl() {
        return new Promise(async resolve => {
            await page.goto(url)
            await timeout(3000)
            let error = await page.$eval("#root", element => {
                let text = element.innerText
                return text.indexOf("服务出现异常") !== -1;
            })
            if (error) {
                let button = await page.$("button span.btn-title")
                await button.click()
            }
            await timeout(4000)
            detailUrl = await page.$$eval("li > div > a", (elements, info) => {
                for (let i = 0; i < elements.length; i++) {
                    let item = elements[i]
                    let text = item.innerText
                    let realID = text.indexOf(info.realID) !== -1
                    let fans = text.indexOf((info.fansCount / 10000).toFixed(1) + "w") !== -1
                    let name = text.indexOf(info.name) !== -1
                    if (realID || (name && fans)) {
                        return item.getAttribute("href")
                    }
                }
            }, info)
            resolve()
        })
    }

    await getDetailUrl()
    if (!detailUrl) {
        url = baseUrl + info.name + params
        await getDetailUrl()
        if (!detailUrl) {
            await page.close()
            return
        }
    }

    // console.log(detailUrl);
    detailUrl = parseUrl(detailUrl)
    await page.goto(detailUrl)
    // await pageScroll(page)
    let urls = await page.$$eval("ul > li > a", elements => {
        let list = []
        elements.forEach(element => {
            let img = element.querySelector("img")
            if (img) {
                list.push(element.getAttribute("href").replace("https:", "").replace("http:", "").replace("//", "https://"))
            }
        })
        return list
    })
    let titles = await page.$$eval("ul > li > a p", elements => {
        let list = []
        elements.forEach(element => {
            list.push(element.innerText)
        })
        return list
    })
    let imageUrls = await page.$$eval(".tt-img-loaded", elements => {
        let list = []
        elements.forEach(element => {
            list.push(element.getAttribute("src").replace("https:", "").replace("http:", "").replace("//", "https://"))
        })
        return list
    })
    let videos = []
    for (let i = 0; i < (urls.length > 3 ? 3 : urls.length); i++) {
        await page.goto(urls[i])
        await page.waitForSelector(".xgplayer-video-interaction-wrap")
        let countList = await page.$$eval(".xgplayer-video-interaction-wrap > div > div", elements => {
            let list = []
            elements.forEach(element => {
                let text = element.innerText
                if (text) {
                    list.push(text)
                }
            })
            return list
        })
        console.log(countList);
        let data = {
            title: titles[i],
            url: urls[i],
            face: imageUrls[i],
            likeCount: countList[0],
            commentCount: countList[1],
            starCount: countList[2]
        }
        videos.push(data)
        console.log(data);

    }
    console.log(JSON.stringify(videos));
    videos = toBase64(JSON.stringify(videos))
    await connection.query(`UPDATE http_request.starmap t
                          SET t.videos = '${videos}' WHERE t.realID = ${id} ;`.replaceAll(/\n/g, ""),
        [],
        async (err, result) => {
            if (err) throw err
            console.log(result);
            await page.close()
        })
}

