const puppeteer = require('puppeteer');
const fs = require('fs');
const md5 = require("md5");
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
})
const {timeout} = require("../utils/timeout");
const {pageScroll} = require("../utils/pageScroll");
const {connection} = require("../mysql/mysqlConnection");
const useProxy = require("puppeteer-page-proxy");
const {randomID} = require("../utils/randomID");
const {getProxy, setProxy} = require("../utils/getProxy");
const {selector} = require("./selector");
let browser,
    addCount = 0, //隔页数 为0则取消隔页翻页
    current = 0,
    profileID = "",
    query = "柚子",
    // baseUrl = "https://list.tmall.com/search_product.htm",
    // baseUrl = "https://s.taobao.com/search",
    baseUrl = "https://search.jd.com/Search",
    baseUrls = ["https://s.taobao.com/search", "https://search.jd.com/Search"],
    url = baseUrl + "?keyword=" + query,
    dataList = [],
    urls = [],
    browserWSEndpoint,
    length = 0,
    platform,
    folderName = "",
    now = new Date().getTime(),
    pauseTime = 0,
    pauseTime2 = 0,
    currentSelector,
    proxy = [
        {
            id: 3740612019,
            ip: '222.245.53.179',
            http_port: '34428',
            http_port_secured: '34428',
            s5_port: '34429',
            s5_port_secured: '34429',
            expire_at_timestamp: '1655351009',
            filter: {province: '湖南省', city: '株洲市', carrier: '电信'}
        }
    ],
    noHasKewWord = ["柚子茶", "酱", "叶", "饮料", "柚子皮"]


async function request(url, first, test) {
    if (first) {
        console.log(global.period);
        console.log("开始");
        await puppeteer.launch({
            ignoreHTTPSErrors: true,
            headless: false,
            userDataDir: "test-profile-dir" + profileID,
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
                browserWSEndpoint = Browser.wsEndpoint();
                console.log("节点已注册");
            }
        );
    }
    console.log("puppeteer已注册");
    browser = await puppeteer.connect({browserWSEndpoint});
    console.log("浏览器已连接");
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {get: () => false})
    })
    await page.evaluate(async () => {
        Object.defineProperty(navigator, 'webdriver', {get: () => false})
    })
    console.log("新标签页已创建");
    await page.setViewport({
        width: 1600,
        height: 900,
        deviceScaleFactor: 1,
    });
    // await getProxy().then(res => {
    //     proxy = res
    // })
    // await setProxy(page, proxy).then(res => {
    //     proxy = [res]
    // })
    console.log("继续", url);
    try {
        await page.goto(url, {timeout: 10000});
    } catch (e) {
        console.log("超时");
        await page.reload(url);
    }
    selectPlatform(url)


    let error = await page.$(".warnning-text")
    if (error) {
        await page.evaluate(() => {
            try {
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined})
            } catch (e) {

            }
        })
        await page.waitForNavigation()
    }

    const $username = await page.$('#fm-login-id');
    const $password = await page.$('#fm-login-password');
    let $loginButton = await page.$('.password-login');
    if ($username) {
        let moveCount = 0
        console.log("需要登录");
        // await page.goto("https://item.taobao.com/item.htm?id=673671579955&ns=1&abbucket=15#detail")
        // await $username.type("13520944872");
        // await $password.type("sr20000923++");
        await timeout(20000)
        const $code = await page.$("#baxia-password");
        await $loginButton.click();
        console.log("等待拖动条");
        await timeout(3000)
        let dialog = await page.$("iframe#baxia-dialog-content")
        if (dialog) {
            console.log("拖动条存在");
            let dialog = await page.$("iframe#baxia-dialog-content")
            dialog = await dialog.contentFrame()
            await dialog.evaluate(async () => {
                try {
                    Object.defineProperty(navigator, 'webdriver', {get: () => false})
                } catch (e) {

                }
            })
            let block = await dialog.$("#nc_1_n1z")
            let box = await block.boundingBox();
            await move(box, moveCount, page)
        } else {
            console.log("拖动条不存在");
        }
        $loginButton = await page.$('.password-login');
        try {
            await $loginButton.click();
        } catch (e) {
        }
        console.log("正在登录");
        await page.screenshot({
            path: "./view_login.png"
        })
        console.log("等待结果");
        await page.waitForNavigation();
        console.log("登录完成");
    }
    await page.waitForSelector(currentSelector.search)
    if (first) {
        await page.focus(currentSelector.search);
        await page.keyboard.press('Backspace');
        await page.keyboard.press('Backspace');
        await page.keyboard.type(query, {delay: 100});
        await page.keyboard.press('Enter');
        await page.waitForNavigation()
    }
    console.log("搜索关键字", query);
    await page.$eval(currentSelector.sort, element => {
        element.click()
    })
    await timeout(3000)
    await page.screenshot({
        path: "./view.png"
    })
    let numberList = [];
    try {
        urls = await page.$$eval(
            currentSelector.urls,
            element => {
                let urls = []
                for (let i = 0; i < element.length; i++) {
                    urls.push(element[i].getAttribute("href"))
                }
                return urls;
            }
        )
    } catch (e) {
        console.log(e);
    }
    console.log(urls.length, "条数据");
    if (urls.length) {
        for (let i = 1; i <= urls.length; i++) {
            let title
            try {
                title = await page.$$eval(currentSelector.name, (elements, i) => {
                    return elements[i].innerText
                }, i)
            } catch (e) {
                continue
            }


            for (let word of noHasKewWord) {
                if (title.includes(word)) {
                    console.log("跳过", title);
                    break
                }
                if (noHasKewWord.at(-1) === word) {
                    numberList.push(i)
                }
            }
        }
        let randomList = [];
        randomSort(numberList, randomList);
        console.log("randomList", randomList);
        console.log("urls", urls);
        console.log("urls", randomList.length);
        console.log("页面滚动中");
        !test && await pageScroll(page);
        try {
            await page.$eval(".baxia-dialog", element => {
                return element.setAttribute("style", "display: none;opacity: 0;")
            })
        } catch (e) {
            // console.log(e);
        }
        let testUrl = '//detail.tmall.com/item.htm?id=667162749625&skuId=4808601756927&areaId=450400&user_id=4270388526&cat_id=2&is_b=1&rn=accbad07b7a95e83e82018ac340f14f5'
        await timeout("random");
        for (let item of randomList) {
            // let key = dataList.length - 1
            let title = await page.$eval(
                currentSelector.face.title(item),
                element => {
                    return element.innerText
                })
            await exists(getKey(urls[item - 1]))
            if (length === 0) {
                console.log(current, item);
                selectPlatform(urls[item - 1])
                if (test) {
                    await requestDetail(testUrl, true)
                } else {
                    await requestDetail(urls[item - 1], true)
                }
                selectPlatform(url)
                try {
                    console.log("face图url提取中");
                    let src = await page.$eval(
                        currentSelector.face.img(item), element => {
                            return element.getAttribute("src")
                        });
                    src = src.replace("https:", "").replace("http:", "");
                    dataList[current].face = "https:" + src
                    console.log("face图url提取完成");
                } catch (e) {
                    console.log(e);
                }
                if (dataList[current].title !== title && dataList[current].title === "") {
                    dataList[current].title = title
                }
                console.log(dataList[current]);
                console.log(JSON.stringify(dataList[current].specifications));
                console.log(dataList[current].specifications[0]);
                await insert(dataList[current])
                console.log(current, "完成");
                // await timeout(4000);
            } else {
                console.log("已存在", current);
                dataList.push({title: "已存在"})
            }
            current++
            if (pauseTime) {
                let currentTime = new Date().getTime() - now
                let $m = currentTime / 60000 // 过去了
                if (pauseTime - $m <= 0) {
                    console.log("暂停", pauseTime2, "分钟");
                    await timeout(pauseTime2 * 60000)
                    now = new Date().getTime();
                } else {
                    console.log(pauseTime - $m, "分钟后暂停");
                }
            }

        }
        let next = await page.$(currentSelector.nextUrl)
        let pageInput = await page.$(currentSelector.pageInput)
        let pageNumber = await page.$eval(currentSelector.pageInput, element => {
            let number = parseInt(element.value)
            element.value = ''
            return number
        })
        if (next) {
            if (addCount) {
                await pageInput.focus()
                await page.keyboard.press('Backspace');
                await page.keyboard.press('Backspace');
                await page.keyboard.press('Backspace');
                await pageInput.type((pageNumber + addCount).toString())
                await page.keyboard.press('Enter')
                console.log("下一页为", pageNumber + addCount);
            } else {
                console.log("下一页click");
                await next.click()
            }
            await timeout(3000)
            let nextUrl = await page.evaluate(() => {
                return location.href
            })
            console.log("下一页");
            urls = []
            dataList = []
            current = 0
            await page.close()
            return request(nextUrl, false)
        }

    } else {
        await page.close()
        return request(url, false)
    }

}


async function requestDetail(url, first) {

    return new Promise(async resolve => {
        console.log("requestDetail");
        let newUrl = url;
        let randomTime = parseInt((Math.random() * 10000).toFixed(0));
        let date = new Date();
        newUrl = newUrl.replaceAll("https:", "").replaceAll("http:", "");

        let data = {
            uniqueID: getKey(url),
            keyword: query,
            title: "",
            time: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:00`,
            platform,
            url: "https:" + newUrl,
            shop: "",
            originCountry: "",
            originProvince: "",
            originAddress: "",
            variety: "",
            specifications: [],
            sales: "",
        };
        const page = await browser.newPage();
        // await useProxy(page, "http://" + proxy[0])

        await page.evaluateOnNewDocument(() => {
            Object.defineProperties(navigator, {webdriver: {get: () => false}})
        })
        await page.setViewport({
            width: 1600,
            height: 900,
            deviceScaleFactor: 1,
        });
        // await page.goto("http://ip-api.com/line/?lang=zh-CN", {timeout: 10000});

        await page.evaluate(async () => {
            try {
                Object.defineProperty(navigator, 'webdriver', {get: () => false})
            } catch (e) {
            }
        })
        let timer, timer2

        timer2 = setTimeout(async () => {
            console.log("页面刷新");
            try {
                await page.reload({waitUntil: ["networkidle0", "domcontentloaded"]});
            } catch (e) {
            }
        }, 25000)
        try {
            await page.goto("https:" + newUrl, {waitUntil: "domcontentloaded"});
        } catch (e) {
            await page.reload({waitUntil: ["networkidle0", "domcontentloaded"]});
        }
        await timeout("random");
        try {
            page.evaluate(() => {
                let totalHeight = 0;
                timer = setInterval(() => {
                    let scrollHeight = 600 || document.body.scrollHeight;
                    window.scrollBy(0, Math.random() * 100);
                    totalHeight += Math.random() * 100;
                    if (totalHeight >= scrollHeight) {
                        window.scrollTo(0, 150);
                        clearInterval(timer);
                        timer = null
                    }
                }, 100);
            })
        } catch (e) {
        }
        await timeout("random");
        // try {
        //     await page.waitForSelector("#side-shop-info .shopLink")
        //     await page.waitForSelector("#J_DetailMeta > div.tm-clear > div.tb-property > div > div.tb-key .tm-sale-prop dt.tb-metatit")
        //     await page.waitForSelector("#J_DetailMeta > div.tm-clear > div.tb-property > div > div.tb-detail-hd > h1")
        // } catch (e) {
        //     console.log(e);
        // }

        async function jdCheck() {
            let one = await page.$(currentSelector.detail.selectArea)
            let two = await page.$(currentSelector.detail.selectArea2)
            if (!one && two) {
                let oneSelect = currentSelector.detail.selectArea
                let oneLabel = currentSelector.detail.label
                let twoSelect = currentSelector.detail.selectArea2
                let twoLabel = currentSelector.detail.label2
                currentSelector.detail.selectArea = twoSelect
                currentSelector.detail.label = twoLabel
                currentSelector.detail.selectArea2 = oneSelect
                currentSelector.detail.label2 = oneLabel
            }
        }

        if (platform === "京东") {
            await jdCheck()
        }
        let dialog = await page.$("iframe#baxia-dialog-content")
        if (dialog) {
            let moveCount = 0
            clearInterval(timer)
            clearTimeout(timer2)
            timer = null
            timer2 = null
            dialog = await dialog.contentFrame()
            let block = await dialog.$("#nc_1_n1z")
            console.log("出现验证框");
            let box = await block.boundingBox();
            console.log(box);
            await move(box, moveCount, page)

        }


        let error = await page.$(".errorDetail");
        let offSales = await page.$("strong.sold-out-tit")
        if (error || offSales) {
            console.log("页面丢失");
            clearInterval(timer)
            clearTimeout(timer2)
            timer = null
            timer2 = null
            dataList.push(data);
            setTimeout(async () => {
                console.log("页面关闭");
                try {
                    await page.close();
                } catch (e) {

                }
                resolve()
            }, randomTime);
        } else {
            console.log("页面存在");
            await puppeteer.connect({browserWSEndpoint});
            let detail,
                title,
                shop,
                shop2,
                label,
                label2
            try {
                await page.$eval("video", element => {
                    element.pause()
                })
            } catch (e) {
                // console.log(e);
            }
            let hasLabel = [true, true]
            try {
                shop = await page.$(currentSelector.detail.shop)
                shop2 = await page.$(currentSelector.detail.shop2)
                await timeout(3000)
                try {
                    label = await page.$eval(currentSelector.detail.label, element => element.innerText);
                } catch (e) {
                    hasLabel[0] = false
                    console.log("没有label");
                }
                try {
                    label2 = await page.$eval(currentSelector.detail.label2, element => element.innerText);
                } catch (e) {
                    hasLabel[1] = false
                    console.log("没有label2");
                }
                title = await page.$eval(currentSelector.detail.title, element => element.innerText.replaceAll("/", "-"));
                if (shop) {
                    data.shop = await page.$eval(currentSelector.detail.shop, element => element.innerText)
                } else if (shop2) {
                    data.shop = await page.$eval(currentSelector.detail.shop2, element => element.innerText)
                } else {
                    data.shop = "天猫超市";
                }
                data.sales = await page.$eval(currentSelector.detail.sales, element => element.innerText);
            } catch (e) {
                console.log(e);
                clearInterval(timer)
                clearTimeout(timer2)
                timer = null
                timer2 = null
                if (first) {
                    console.log("数据有误,即将重试");
                    try {
                        await page.close();
                    } catch (e) {
                    }
                    await requestDetail(url, false);
                    // await timeout(10000000)
                } else {
                    console.log("数据有误,跳过当前");
                    dataList.push(data);
                    try {
                        await page.close();
                    } catch (e) {
                    }
                    resolve()
                    return resolve()
                }
            }
            clearInterval(timer)
            clearTimeout(timer2)
            timer = null
            timer2 = null
            console.log("处理detail");

            async function initSelectArea() {
                return new Promise(async resolve1 => {
                    try {

                        await page.$eval(currentSelector.detail.selectArea + " " + currentSelector.detail.selected,
                            (element) => {
                                element.querySelector("a").click()
                            }, currentSelector.detail.selectArea2)
                        await page.$eval(currentSelector.detail.selectArea2 + " " + currentSelector.detail.selected,
                            (element) => {
                                element.querySelector("a").click()
                            })
                        await timeout(1000)
                        resolve1()
                    } catch (e) {
                        // console.log(e);
                        console.log("无已选择");
                        await timeout(1000)
                        resolve1()
                    }
                })

            }

            let selectArea
            try {
                selectArea = await page.$(currentSelector.detail.selectArea)
            } catch (e) {
                resolve()
                return
            }
            if (selectArea && (hasLabel[0] === true || hasLabel[1] === true)) {
                await initSelectArea()
                console.log("选择区已初始化");
                let one = await page.$$(currentSelector.detail.selectArea + " " + currentSelector.detail.item)
                console.log("O可选择数量", one.length);
                for (let i = 0; i < one.length; i++) {
                    await initSelectArea()
                    console.log("选择区已初始化");
                    let labelText
                    let prices = ""
                    try {
                        labelText = await page.$eval(
                            currentSelector.detail.selectArea,
                            (element, i, li) => {
                                let spans = element.querySelectorAll(li + " span")
                                let as = element.querySelectorAll(li + " a")
                                as[i].click()
                                return (spans[i] || as[i]).innerText
                            }, i, currentSelector.detail.item)
                        let timer4 = setTimeout(async () => {
                            try {
                                page.reload({waitUntil: ["networkidle0", "domcontentloaded"]});
                            } catch (e) {
                            }
                        }, 7000)
                        await page.waitForSelector(currentSelector.detail.price)
                        clearTimeout(timer4)
                        timer4 = null
                    } catch (e) {
                        console.log(e);
                    }
                    await timeout(1000, true)
                    let two = await page.$$(currentSelector.detail.selectArea2 + " " + currentSelector.detail.item)
                    console.log("T可选择数量", two.length);
                    if (!two.length) {
                        prices = await page.$$eval(currentSelector.detail.price, elements => {
                            return elements[elements.length - 1].innerText
                        })
                        title = title.replace(/\\n/g, "").replaceAll(labelText, "")
                        data.specifications.push({
                            label: `${label}: ${labelText}`,
                            price: prices
                        })
                    }
                    for (let j = 0; j < two.length; j++) {
                        try {
                            console.log("第", i + 1, "行,第", j + 1, "个");
                            //第二行的可选择数量
                            let text = await page.$eval(
                                currentSelector.detail.selectArea2,
                                (element, j, li) => {
                                    let spans = element.querySelectorAll(li + " span")
                                    let as = element.querySelectorAll(li + " a")
                                    as[j].click()
                                    return (spans[j] || as[j]).innerText
                                }, j, currentSelector.detail.item)
                            let timer4 = setTimeout(async () => {
                                try {
                                    page.reload({waitUntil: ["networkidle0", "domcontentloaded"]});
                                } catch (e) {
                                }
                            }, 7000)
                            await page.waitForSelector(currentSelector.detail.price)
                            clearTimeout(timer4)
                            timer4 = null
                            await timeout(500, true)
                            console.log("判断价格");
                            let price = await page.$$eval(currentSelector.detail.price, elements => {
                                return elements[elements.length - 1].innerText
                            })
                            data.specifications.push({
                                label: `${label}: ${labelText}; ${label2}: ${text}`,
                                price
                            })
                            if (platform === "京东") {
                                title = title.replace(/\\n/g, "").replaceAll(labelText, "")
                            }

                        } catch (e) {
                            console.log(e);
                        }
                    }
                    await timeout(500, true)
                }
            } else {
                if (platform === "京东") {
                    try {
                        data.specifications = await page.$eval("span.p-price span.price", element => {
                            return element.innerText
                        })
                    } catch (e) {
                        await page.reload({waitUntil: ["networkidle0", "domcontentloaded"]});
                        data.specifications = await page.$eval("span.p-price span.price", element => {
                            return element.innerText
                        })
                    }
                }
            }
            let details = await page.$$eval(
                currentSelector.detail.details,
                elements => {
                    let list = []
                    elements.forEach((value, index) => {
                        let text = value.innerText
                        if (text.indexOf("：") !== -1) {
                            list.push(text.split("："))
                        } else {
                            list.push(text.split(":"))
                        }
                    })
                    return list
                })
            console.log(details);
            for (let detail1 of details) {
                let text = detail1[1].trim()
                switch (detail1[0].trim()) {
                    case  "产地":
                    case "商品产地":
                    case "原产地":
                        data.originCountry = text
                        break
                    case "省份":
                        data.originProvince = text
                        break
                    case "城市":
                        data.originAddress = text
                        break
                    case "特产品类":
                    case "水果种类":
                    case "品种":
                    case "种类":
                        data.variety = text
                        break
                }
            }
            data.title = title;
            console.log("获取完成,正在保存图片");
            let d = new Date()
            let m = d.getMonth() + 1
            if (m < 10) {
                m = "0" + m
            }
            let smallPlatform
            if (platform === "京东") {
                smallPlatform = "jd"
            } else if (platform === "天猫") {
                smallPlatform = "tm"
            } else if (platform === "淘宝") {
                smallPlatform = "tb"
            } else {
                smallPlatform = "error"
            }
            if (!fs.existsSync("./images")) {//加载完毕保存图片
                fs.mkdirSync("./images");
            }
            let cacheName = smallPlatform + global.period
            folderName = "./images/" + cacheName + data.uniqueID
            if (!fs.existsSync(folderName)) {//加载完毕保存图片
                fs.mkdirSync(folderName);
            }
            try {
                detail = await page.$(currentSelector.detail.area);
                detail && await detail.screenshot({
                    path: folderName + "/detail.png"
                });
                console.log("截图成功");
            } catch (e) {
                console.log("截图失败", e);
            }
            dataList.push(data);
            await timeout("random");
            try {
                await page.close();
            } catch (e) {
                console.log(e);
            }
            console.log("页面关闭");
            await timeout("random");
            resolve()
        }
    })

}


function randomSort(arr, newArr) {
    if (arr.length === 1) {
        newArr.push(arr[0]);
        return // 相当于递归退出
    }
    let random = Math.ceil(Math.random() * arr.length) - 1;
    newArr.push(arr[random]);
    arr.splice(random, 1);
    randomSort(arr, newArr);
}

async function exists(id) {
    console.log("ID:", id);
    let d = new Date()
    let m = d.getMonth() + 1
    if (m < 10) {
        m = "0" + m
    }
    return new Promise(resolve => {
        connection.query(
            "select * from pomelo where uniqueID = ? and type = ?",
            [id, global.period],
            async (err, result) => {
                length = result.length
                resolve();
            })
    })
}

async function insert({
                          uniqueID,
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
                          face
                      }) {
    // if (specifications.length === 0) {
    //     return console.log("跳过该数据");
    // }
    return new Promise(async (resolve, reject) => {
            let d = new Date()
            let m = d.getMonth() + 1
            if (m < 10) {
                m = "0" + m
            }
            if (length === 0) {
                console.log("开始添加");
                await connection.query(
                    `INSERT INTO pomelo (id,
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
                                        md5)
                     VALUES ('${randomID()}',
                             '${uniqueID}',
                             '${global.period}',
                             '${keyword}',
                             '${title}',
                             '${time}',
                             '${platform}',
                             '${url}',
                             '${shop}',
                             '${originCountry}',
                             '${originProvince}',
                             '${originAddress}',
                             '${variety}',
                             '${JSON.stringify(specifications)}',
                             '${sales}',
                             '${face}',
                             '${md5(JSON.stringify(specifications))}');`.replaceAll("\n", ""),
                    (err, result) => {
                        if (err) {
                            throw err;
                        }
                        resolve();
                    }
                );
            } else {
                console.log("已存在");
                resolve();
            }
        }
    );

}

async function move(box, count, page) {
    return new Promise(async resolve1 => {
        let timer3 = setInterval(async () => {
            try {
                if (await page.$("iframe#baxia-dialog-content")) {
                    await page.mouse.move(box.x + 10, box.y + 10);
                    await page.mouse.down();
                    await page.evaluate(async () => {
                        try {
                            Object.defineProperty(navigator, 'webdriver', {get: () => false})
                        } catch (e) {

                        }
                    })
                    let dialog = await page.$("iframe#baxia-dialog-content")
                    dialog = await dialog.contentFrame()
                    await dialog.evaluate(async () => {
                        function test(obj) {
                            if (obj)
                                Object.defineProperty(navigator, 'webdriver', {get: () => false})
                            let event = document.createEvent('MouseEvents');
                            event.initEvent('mousedown', true, false);
                            document.querySelector("#nc_1_n1z").dispatchEvent(event);
                            event = document.createEvent('MouseEvents');
                            event.initEvent('mousemove', true, false);
                            Object.defineProperty(event, 'clientX', {get: () => 260})
                            document.querySelector("#nc_1_n1z").dispatchEvent(event);
                        }

                        try {
                            test(true)
                        } catch (e) {
                            test()
                        }
                    })
                    for (let i = 0; i < 10; i++) {
                        await page.mouse.move(box.x + i * 50 + Math.random() * 5, box.y + 10 + Math.random() * 2, {steps: Math.floor(Math.random() * 3 + 1)});
                    }
                    await timeout(1874);
                    await page.mouse.up()
                    await timeout("random");
                    if (await page.$("iframe#baxia-dialog-content")) {
                        await page.mouse.move(box.x + 10, box.y + 10);
                        await page.mouse.down();
                        await page.mouse.up();
                        count++
                    }
                    if (count > 2) {
                        count = 0
                        await page.reload({waitUntil: ["networkidle0", "domcontentloaded"]});
                        await timeout();
                    }
                } else {
                    clearInterval(timer3)
                    timer3 = null
                    resolve1()
                }
            } catch (e) {

            }

        }, 4000)
    })
}

function selectPlatform(url) {
    if (url.indexOf("tmall.com") !== -1) {
        currentSelector = selector.tmall
        platform = "天猫"
    } else if (url.indexOf("taobao.com") !== -1) {
        currentSelector = selector.taobao
        platform = "淘宝"
    } else if (url.indexOf("jd.com") !== -1) {
        currentSelector = selector.jd
        platform = "京东"
    }
}

function getKey(url) {
    if (platform === "京东") {
        return parseInt(url.split(".com/")[1].split(".")[0])
    } else {
        let key = url.split("?")[1].split("&")
        for (let i = 0; i < key.length; i++) {
            if (key[i].indexOf("id=") !== -1) {
                return parseInt(key[i].replace("id=", ""))
            }
        }
    }
}


readline.question("淘宝/京东:[int]", (number) => {
    if (isNaN(parseInt(number))) {
        number = 0
    }
    if (!parseInt(number)) {
        console.log(number, "淘宝")
        url = baseUrls[0]
    } else {
        console.log(number, "京东")
        url = baseUrls[1]
    }
    initNext(1)
})

function initNext(type) {
    switch (type) {
        case 1:
            return readline.question("并发ID:[int]", (number) => {
                if (isNaN(parseInt(number))) {
                    number = 0
                }
                if (parseInt(number) === 0) {
                    console.log(number, "并发ID")
                } else {
                    profileID = number
                    console.log(profileID, "并发ID")
                }
                initNext(2)
            })
        case 2:
            return readline.question("跳页:[int]", (number) => {
                if (isNaN(parseInt(number))) {
                    number = 0
                }
                addCount = parseInt(number)
                console.log(addCount, "页")
                initNext(3)
            })
        case 3:
            return readline.question("指定分钟后暂停:[int]", (number) => {
                if (isNaN(parseInt(number))) {
                    number = 0
                    initNext(5)
                } else {
                    pauseTime = parseInt(number)
                    console.log(pauseTime, "分")
                    initNext(4)
                }
            })
        case 4:
            return readline.question("暂停多久(分钟):[int]", (number) => {
                if (isNaN(parseInt(number))) {
                    number = 0
                }
                pauseTime2 = parseInt(number)
                console.log(pauseTime, "分后暂停", pauseTime2, "分钟");
                initNext(5)
            })
        case 5:
            readline.close()
            now = new Date().getTime();
            return request(url, true, false).then(r => console.log("结束"));
    }
}
