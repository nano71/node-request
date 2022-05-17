const {connection} = require("./mysqlConnection");
const puppeteer = require('puppeteer');
const {timeout} = require("./timeout");
let list,
    browser,
    browserWSEndpoint,
    baseUrl = "https://www.douyin.com/search/",
    params = "?source=switch_tab&type=user"
connection.query("select * from starmap where realID is not null", [], async (err, result) => {
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
        let id = list[i].realID
        await nextRequest(id)
    }
}

async function nextRequest(id) {
    let url = baseUrl + id + params
    const page = await browser.newPage();
    await page.setViewport({
        width: 1600,
        height: 900,
        deviceScaleFactor: 1,
    });
    await page.goto(url)
    await page.mainFrame().addScriptTag({
        url: 'https://cdn.bootcss.com/jquery/3.2.0/jquery.min.js'
    })
    await timeout(3000)
}
