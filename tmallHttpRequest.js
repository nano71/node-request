const puppeteer = require('puppeteer');
const fs = require('fs');

const mysql = require("mysql");
const {val} = require("cheerio/lib/api/attributes");
let connection = mysql.createPool({
        host: "localhost",
        port: "3306",
        user: "root",
        password: "123456",
        database: "tmall",
        connectionLimit: "20" //设置连接池的数量
    }), browser,
    current = 0,
    query = "柚子",
    url = "https://list.tmall.com/search_product.htm?q=" + query,
    dataList = [],
    urls = [],
    browserWSEndpoint,
    folderName = "";

async function request(url, first) {
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
        await pageScroll(page);
        try {
            await page.$eval(".baxia-dialog", element => {
                return element.setAttribute("style", "display: none;opacity: 0;")
            })
        } catch (e) {
            // console.log(e);
        }

        await timeout("random");
        for (let item of randomList) {
            console.log(current, item);
            await requestDetail(urls[item - 1], true)
            try {
                console.log("face图保存中");
                let src = await page.$eval(
                    `#J_ItemList > div:nth-child(${item}) > div > div.productImg-wrap > a > img`, element => {
                        return element.getAttribute("src")
                    });
                src.replace("https:", "").replace("http:", "");
                dataList[dataList.length - 1].face = "https:" + src
                console.log("face图url提取完成");
            } catch (e) {
                console.log(e);
            }
            console.log(dataList[current - 1]);
            console.log(dataList[current - 1].specifications);
            console.log(dataList[current - 1].specifications[0]);
            console.log(current - 1, "完成");
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
        if (log) {
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
            price: "",
            weight: "",
            sales: "",
        };
        newUrl.replace("https:", "").replace("http:", "");
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

        try {
            timer2 = setTimeout(async () => {
                console.log("页面刷新");
                await page.reload({waitUntil: ["networkidle0", "domcontentloaded"]});
            }, 25000)
        } catch (e) {
        }

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
                        window.scrollTo(0, 50);
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
            console.log("出现验证框");
            await page.evaluate(async () => {
                try {
                    Object.defineProperty(navigator, 'webdriver', {get: () => false})
                } catch (e) {
                }
            })
            let box = await dialog.boundingBox();
            await page.mouse.move(box.x + 60, box.y + 200);
            await page.mouse.down();
            await page.mouse.move(box.x+ 360, box.y + 200, {steps: 4});
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
                current++
                console.log("页面关闭");
                await page.close();
                return resolve()
            }, randomTime);
        } else {

            console.log("页面存在");
            await puppeteer.connect({browserWSEndpoint});
            let detail = await page.$("#J_DetailMeta");
            let title
            let label
            let label2
            let detailUl
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

                detailUl = await page.$$eval(
                    ".tm-sale-prop",
                    elements => {
                        let list = []
                        for (let i = 0; i < elements.length; i++) {
                            let childList = []
                            let row = elements[i].querySelectorAll("li:not(.tb-out-of-stock) span")
                            row.forEach(async (element, key) => {
                                childList.push(element.innerText)
                            })
                            list.push(childList)
                        }
                        return list;
                    }
                )
            } catch (e) {
                console.log(e);
                clearInterval(timer)
                clearTimeout(timer2)
                await page.close();
                if (first) {
                    console.log("数据有误,即将重试");
                    return await requestDetail(url, false);
                } else {
                    console.log("数据有误,跳过当前");
                    dataList.push(data);
                    console.log(data);
                    current++
                    resolve()
                    return
                }
            }
            console.log("detailUl", detailUl);
            clearInterval(timer)
            clearTimeout(timer2)
            console.log("处理detail");

            async function initSelectArea() {
                return new Promise(async resolve1 => {
                    try {
                        page.$$eval("dl.tm-sale-prop ul li.tb-selected", elements => {
                            elements.forEach(element => {
                                element.querySelector("a").click()
                            })
                        })
                        resolve1()
                    } catch (e) {
                        console.log(e);
                    }
                })

            }

            let selectArea = await page.$("dl.tm-sale-prop")
            if (selectArea) {
                for (let i = 0; i < detailUl[0].length; i++) {
                    let labelText
                    let prices = []
                    await initSelectArea()
                    console.log("选择区已初始化");
                    await timeout(1000)
                    try {
                        labelText = await page.$eval(
                            `dl.tm-sale-prop:nth-child(1)`,
                            (element, i) => {
                                let spans = element.querySelectorAll("li:not(.tb-out-of-stock) span")
                                spans[i].parentElement.click()
                                return spans[i].innerText
                            }, i)
                        await timeout(500)
                    } catch (e) {
                        console.log(e);
                    }
                    for (let j = 0; j < detailUl[1].length; j++) {
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
                            await timeout(500)
                            let price = await page.$$eval("span.tm-price", elements => {
                                return elements[elements.length - 1].innerText
                            })
                            prices.push({
                                from: label2,
                                label: text,
                                price
                            })

                            await timeout(500)
                        } catch (e) {
                            console.log(e);
                        }
                    }
                    data.specifications.push({
                        from: label,
                        label: labelText,
                        prices
                    })
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
            current++;
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

function getOffset(el) {
    el = el.getBoundingClientRect();
    return {
        left: el.left + window.scrollX,
        top: el.top + window.scrollY
    }
}

request(url, true).then(r => console.log("结束"));
