const puppeteer = require('puppeteer');
const fs = require('fs');

const mysql = require("mysql");
const {val} = require("cheerio/lib/api/attributes");
let connection = mysql.createPool({
        host: "localhost",
        port: "3306",
        user: "root",
        password: "123456",
        database: "http_request",
        connectionLimit: "20" //设置连接池的数量
    }), browser,
    current = 0,
    query = "柚子",
    url = "https://list.tmall.com/search_product.htm?q=" + query,
    dataList = [],
    urls = [],
    browserWSEndpoint,
    folderName = "";

async function request(url, first, test) {
    if (first) {
        console.log("开始");
        await puppeteer.launch({
            ignoreHTTPSErrors: true,
            headless: false,
            userDataDir: 'test-profile-dir',
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
    console.log("puppeteer已注册");
    browser = await puppeteer.connect({browserWSEndpoint});
    console.log("浏览器已连接");
    const page = await browser.newPage();
    await page.evaluate(async () => {
        Object.defineProperty(navigator, 'webdriver', {get: () => false})
    })
    console.log("新标签页已创建");
    await page.setViewport({
        width: 1600,
        height: 900,
        deviceScaleFactor: 1,
    });
    await page.goto(url);
    const $username = await page.$('#fm-login-id');
    const $password = await page.$('#fm-login-password');
    const $loginButton = await page.$('.password-login');
    if ($username) {
        let moveCount = 0

        async function move() {
            moveCount++
            console.log("滑块次数:", moveCount);
            let size = await $code.boundingBox();
            console.log(size.height);
            await page.mouse.move(size.x, size.y);
            await page.mouse.down();
            await page.mouse.move(size.x + size.width, size.y, {steps: 4});
            await page.mouse.up()
            await timeout(3000)
            await page.screenshot({
                path: "./view_move_" + moveCount + ".png"
            })
            await timeout(2000)
            let style = await (await (await page.$(".baxia-container")).getProperty("outerHTML")).jsonValue()

            if (style.indexOf("block") < 80) {
                await page.evaluate(async () => {
                    try {
                        Object.defineProperty(navigator, 'webdriver', {get: () => false})
                    } catch (e) {
                    }
                })
                await page.mouse.move(size.x, size.y);
                await page.mouse.down();
                await page.mouse.up();
                await page.screenshot({
                    path: "./view_login_" + moveCount + ".png"
                })
                return move()
            }
        }

        console.log("需要登录");
        await $username.type("13520944872");
        await $password.type("sr20000923++");
        await page.click('body');
        console.log("等待拖动条");

        await timeout(3000)
        const $code = await page.$("#baxia-password");
        if ($code) {
            console.log("拖动条存在");
            await move()
        } else {
            console.log("拖动条不存在");
        }
        await $loginButton.click();
        console.log("正在登录");
        await page.screenshot({
            path: "./view_login.png"
        })
        console.log("等待结果");
        await page.waitForNavigation();
        console.log("登录完成");
    }
    console.log("搜索关键字", query);
    await timeout(3000)
    await page.screenshot({
        path: "./view.png"
    })
    let numberList = [];
    try {
        urls = await page.$$eval(
            `#J_ItemList > div > div > p.productTitle > a`,
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
            numberList.push(i)
        }
        let randomList = [];
        randomSort(numberList, randomList);
        console.log("randomList", randomList);
        console.log("urls", urls);
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
            console.log(current, item);
            if (test) {
                await requestDetail(testUrl, true)
            } else {
                await requestDetail(urls[item - 1], true)
            }
            try {
                console.log("face图保存中");
                let src = await page.$eval(
                    `#J_ItemList > div:nth-child(${item}) > div > div.productImg-wrap > a > img`, element => {
                        return element.getAttribute("src")
                    });
                src.replace("https:", "").replace("http:", "");
                dataList[current].face = "https:" + src
                console.log("face图url提取完成");
            } catch (e) {
                console.log(e);
            }
            console.log(dataList[current]);
            console.log(JSON.stringify(dataList[current].specifications));
            console.log(dataList[current].specifications[0]);
            await insert(dataList[current])
            console.log(current, "完成");
            current++
            await timeout("random");
        }
    } else {
        await page.close()
        return request(url, false)
    }
}


async function timeout(type, log) {
    return new Promise(resolve => {
        let randomTime = parseInt((Math.random() * 5000).toFixed(0));
        if (type !== "random") {
            randomTime = type
        }
        if (log === undefined) {
            console.log(randomTime, "毫秒延迟");
        }
        setTimeout(resolve, randomTime)
    })
}

async function requestDetail(url, first) {

    return new Promise(async resolve => {
        console.log("requestDetail");
        let newUrl = url;
        let randomTime = parseInt((Math.random() * 10000).toFixed(0));

        let date = new Date();
        newUrl.replaceAll("https:", "").replaceAll("http:", "");

        let data = {
            keyword: query,
            title: "",
            time: `${date.getFullYear()}-${date.getMonth() - 1}-${date.getDate()}`,
            platform: "天猫",
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
        await page.setViewport({
            width: 1600,
            height: 900,
            deviceScaleFactor: 1,
        });
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


        await page.goto("https:" + newUrl, {waitUntil: "domcontentloaded"});


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
        let dialog = await page.$("iframe#baxia-dialog-content")
        if (dialog) {
            dialog = await dialog.contentFrame()
            let block = await dialog.$("#nc_1_n1z")
            console.log("出现验证框");

            let box = await block.boundingBox();
            console.log(box);
            // await dialog.hover("#nc_1_n1z")
            await page.mouse.move(box.x + 10, box.y + 10);
            await page.mouse.down();
            await page.evaluate(async () => {
                Object.defineProperty(navigator, 'webdriver', {get: () => false})
            })
            await dialog.evaluate(async () => {
                Object.defineProperty(navigator, 'webdriver', {get: () => false})
            })

            // await timeout(10000)
            await page.mouse.move(box.x + 300, box.y + 10, {steps: 4});
            // await timeout(10000)
            await timeout("random");
            await page.mouse.up()
            await timeout(3000)
            console.log("再次滑动");
            await page.mouse.move(box.x + 10, box.y + 10);
            await page.mouse.down();
            await page.mouse.move(box.x + 300, box.y + 10, {steps: 4});
            await timeout("random");
            await page.mouse.up()

        }
        let error = await page.$(".errorDetail");
        let offSales = await page.$("strong.sold-out-tit")
        if (error || offSales) {
            console.log("页面丢失");
            clearInterval(timer)
            clearTimeout(timer2)
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
            let detail = await page.$("#J_DetailMeta");
            let title
            let label
            let label2
            try {
                await page.$eval("video.lib-video", element => {
                    element.pause()
                })
            } catch (e) {
                // console.log(e);
            }
            try {

                let shop = await page.$("#side-shop-info .shopLink")
                label = await page.$eval("#J_DetailMeta .tm-sale-prop dt.tb-metatit", element => element.innerText);
                label2 = await page.$eval("#J_DetailMeta .tm-sale-prop:nth-child(2) dt.tb-metatit", element => element.innerText);
                title = await page.$eval("#J_DetailMeta > div.tm-clear > div.tb-property > div > div.tb-detail-hd > h1", element => element.innerText.replaceAll("/", ""));
                if (shop) {
                    data.shop = await page.$eval("#side-shop-info .shopLink", element => element.innerText);
                } else {
                    data.shop = "天猫超市";
                }

                data.sales = await page.$eval(".tm-ind-sellCount .tm-count", element => element.innerText);
            } catch (e) {
                console.log(e);
                clearInterval(timer)
                clearTimeout(timer2)

                if (first) {
                    console.log("数据有误,即将重试");
                    await page.close();
                    await requestDetail(url, false);
                    // await timeout(10000000)
                } else {
                    console.log("数据有误,跳过当前");
                    dataList.push(data);
                    await page.close();
                    resolve()
                    return
                }
            }
            clearInterval(timer)
            clearTimeout(timer2)
            console.log("处理detail");

            async function initSelectArea() {
                return new Promise(async resolve1 => {
                    try {
                        await page.$eval("li.tb-selected", element => {
                            element.querySelector("a").click()
                            document.querySelector("li.tb-selected a").click()
                        })
                        await timeout(1000)
                        resolve1()
                    } catch (e) {
                        console.log(e);
                    }
                })

            }

            let selectArea = await page.$("dl.tm-sale-prop")
            if (selectArea) {
                await initSelectArea()
                console.log("选择区已初始化");
                let one = await page.$$("dl.tm-sale-prop:nth-child(1) li:not(.tb-out-of-stock)")
                console.log("O可选择数量", one.length);
                for (let i = 0; i < one.length; i++) {
                    await initSelectArea()
                    console.log("选择区已初始化");
                    let labelText
                    let prices = []
                    try {
                        labelText = await page.$eval(
                            `dl.tm-sale-prop:nth-child(1)`,
                            (element, i) => {
                                let spans = element.querySelectorAll("li:not(.tb-out-of-stock) span")
                                spans[i].parentElement.click()
                                return spans[i].innerText
                            }, i)
                    } catch (e) {
                        console.log(e);
                    }
                    await timeout(1000, true)
                    let two = await page.$$("dl.tm-sale-prop:nth-child(2) li:not(.tb-out-of-stock)")
                    console.log("T可选择数量", two.length);
                    for (let j = 0; j < two.length; j++) {
                        try {
                            console.log("第", i + 1, "行,第", j + 1, "个");
                            //第二行的可选择数量
                            let text = await page.$eval(
                                `dl.tm-sale-prop:nth-child(2)`,
                                (element, j) => {
                                    let spans = element.querySelectorAll("li:not(.tb-out-of-stock) span")
                                    spans[j].parentElement.click()
                                    return spans[j].innerText
                                }, j)
                            await timeout(500, true)
                            let price = await page.$$eval("span.tm-price", elements => {
                                return elements[elements.length - 1].innerText
                            })
                            prices.push({
                                from: label2,
                                label: text,
                                price
                            })

                        } catch (e) {
                            console.log(e);
                        }
                    }
                    data.specifications.push({
                        from: label,
                        label: labelText,
                        prices
                    })
                    await timeout(500, true)

                }
            }
            let details = await page.$$eval("#J_AttrUL li", elements => {
                let list = []
                elements.forEach((value, index) => {
                    let text = value.innerText
                    list.push(text.split(":"))
                })
                return list
            })
            console.log(details);
            for (let detail1 of details) {
                let text = detail1[1]
                switch (detail1[0]) {
                    case  "产地":
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
                        data.variety = text
                        break
                }
            }
            data.title = title;
            console.log("获取完成,正在保存图片");
            folderName = "./柚子/" + title || "错误" + "/"
            if (!fs.existsSync(folderName)) {//加载完毕保存图片
                fs.mkdirSync(folderName);
            }
            try {
                detail && await detail.screenshot({
                    path: folderName + "/detail.png"
                });
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
            return resolve()
        }
    })

}


function pageScroll(page) {
    return page.evaluate(() => {
        return new Promise((resolve, reject) => {
            let totalHeight = 0;
            let timer = setInterval(() => {
                window.scrollBy(0, Math.random() * 100);
                totalHeight += Math.random() * 100;
                if (totalHeight >= document.body.scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        })
    });
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

async function insert({
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
                          sales
                      }) {
    return new Promise((resolve, reject) => {
        connection.query(
            "select * from tmall where url = ?",
            [url],
            async (err, result) => {
                if (result.length === 0) {
                    console.log("开始添加");
                    await connection.query(
                        `INSERT INTO tmall (keyword,
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
                                            sales)
                         VALUES ('${keyword}',
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
                                 '${sales}');`,
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

    })
}


request(url, true, false).then(r => console.log("结束"));
