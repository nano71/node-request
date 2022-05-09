const puppeteer = require('puppeteer');
const fs = require('fs');

const mysql = require("mysql");
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
    // baseUrl = "https://list.tmall.com/search_product.htm",
    // baseUrl = "https://s.taobao.com/search",
    baseUrl = "https://search.jd.com/Search",
    url = baseUrl + "?keyword=" + query,
    dataList = [],
    urls = [],
    browserWSEndpoint,
    length = 0,
    platform,
    folderName = "";

let selector = {
    taobao: {
        platform: "taobao",
        urls: `div.ctx-box.J_MouseEneterLeave.J_IconMoreNew > .title > a`,
        face: {
            a(index) {
                return `#mainsrp-itemlist .items .item:nth-child(${index}) .title > a`
            },
            title(index) {
                return `#mainsrp-itemlist .items .item:nth-child(${index}) .title > a`
            },
            img(index) {
                return `#mainsrp-itemlist .items .item:nth-child(${index}) img.J_ItemPic.img`
            }
        },
        detail: {
            area: ".tb-item-info",
            title: "#J_Title > h3",
            shop: "a.shop-name-link",
            shop2: "#J_ShopInfo > div > div.tb-shop-info-hd > div.tb-shop-name > dl > dd > strong > a",
            label: "#J_isku dl.J_Prop.tb-prop:nth-child(1) > dt",
            label2: "#J_isku dl.J_Prop.tb-prop:nth-child(2) > dt",
            price: ".tb-rmb-num",
            sales: "#J_SellCounter",
            selectArea: "dl.J_Prop.tb-prop:nth-child(1)",
            selectArea2: "dl.J_Prop.tb-prop:nth-child(2)",
            selected: "li.tb-selected",
            item: "li:not(.tb-out-of-stock)",
            details: ".attributes-list li"
        },
        nextUrl: ".item.next"
    },
    tmall: {
        platform: "tmall",
        urls: `#J_ItemList > div > div > p.productTitle > a`,
        face: {
            a(index) {
                return `#J_ItemList div.product:nth-child(${index}) p.productTitle a`
            },
            title(index) {
                return `#J_ItemList div.product:nth-child(${index}) p.productTitle a`
            },
            img(index) {
                return `#J_ItemList > div:nth-child(${index}) > div > div.productImg-wrap > a > img`
            }
        },
        detail: {
            area: "#J_DetailMeta",
            title: "#J_DetailMeta > div.tm-clear > div.tb-property > div > div.tb-detail-hd > h1",
            shop: "#shopExtra > div.slogo > a > strong",
            shop2: "#side-shop-info > div > h3 > div > a",
            label: "#J_DetailMeta .tm-sale-prop > dt.tb-metatit",
            label2: "#J_DetailMeta .tm-sale-prop:nth-child(2) > dt.tb-metatit",
            price: "span.tm-price",
            sales: "span.tm-count",
            selectArea: "dl.tm-sale-prop:nth-child(1)",
            selectArea2: "dl.tm-sale-prop:nth-child(2)",
            selected: "li.tb-selected",
            item: "li:not(.tb-out-of-stock)",
            details: "#J_AttrUL li"
        },
        nextUrl: "a.ui-page-next"
    },
    jd: {
        platform: "jd",
        urls: "#J_goodsList > ul li.gl-item .p-name a",
        face: {
            a(index) {
                return `#J_goodsList > ul > li:nth-child(${index}) > div > div.p-name > a`
            },
            title(index) {
                return `#J_goodsList > ul > li:nth-child(${index}) > div > div.p-name > a`
            },
            img(index) {
                return `#J_goodsList > ul > li:nth-child(${index}) > div > div.p-img > a > img`
            }
        },
        detail: {
            area: "body > div:nth-child(10) > div",
            title: "body > div:nth-child(10) > div > div.itemInfo-wrap > div.sku-name",
            shop: "#popbox > div > div.mt > h3 > a",
            shop2: "#crumb-wrap > div > div.contact.fr.clearfix > div.J-hove-wrap.EDropdown.fr > div:nth-child(1) > div > a",
            label: "#choose-attr-1 > .dt",
            label2: "#choose-attr-2 > .dt",
            price: "body > div:nth-child(10) > div > div.itemInfo-wrap > div.summary.summary-first > div > div.summary-price.J-summary-price > div.dd > span.p-price > span.price",
            sales: "#comment-count > a",
            selectArea: "#choose-attr-1 > div.dd",
            selectArea2: "#choose-attr-2 > div.dd",
            selected: ".item.selected",
            item: ".item",
            details: ".p-parameter-list li"
        },
        nextUrl: "a.ui-page-next"
    }
}
let currentSelector

selectPlatform(baseUrl)

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
    let error = await page.$(".warnning-text")
    if (error) {
        await page.evaluate(async () => {
            Object.defineProperty(navigator, 'webdriver', {get: () => false})
        })
        await timeout(10000)

    }

    const $username = await page.$('#fm-login-id');
    const $password = await page.$('#fm-login-password');
    const $loginButton = await page.$('.password-login');
    if ($username) {
        let moveCount = 0


        console.log("需要登录");
        await $username.type("13520944872");
        await $password.type("sr20000923++");
        await page.click('body');
        console.log("等待拖动条");

        await timeout(3000)
        const $code = await page.$("#baxia-password");
        if ($code) {
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
            let title = await page.$eval(
                currentSelector.face.title(item),
                element => {
                    return element.innerText
                })
            await exists(title.replaceAll("/", "-"))
            if (length === 0) {
                console.log(current, item);
                selectPlatform(urls[item - 1])
                if (test) {
                    await requestDetail(testUrl, true)
                } else {
                    await requestDetail(urls[item - 1], true)
                }
                selectPlatform(baseUrl)
                try {
                    console.log("face图url提取中");
                    let src = await page.$eval(
                        currentSelector.face.img(item), element => {
                            return element.getAttribute("src")
                        });
                    src.replace("https:", "").replace("http:", "");
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
                await timeout("random");
            } else {
                console.log("已存在", current);
                dataList.push({title: "已存在"})
            }
            current++
        }
        let next = await page.$(currentSelector.nextUrl)
        if (next) {
            await (await page.$(currentSelector.nextUrl)).click()
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
        newUrl = newUrl.replaceAll("https:", "").replaceAll("http:", "");

        let data = {
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
            try {
                shop = await page.$(currentSelector.detail.shop)
                shop2 = await page.$(currentSelector.detail.shop2)
                label = await page.$eval(currentSelector.detail.label, element => element.innerText);
                try {
                    label2 = await page.$eval(currentSelector.detail.label2, element => element.innerText);
                } catch (e) {
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

            let selectArea = await page.$(currentSelector.detail.selectArea)
            if (selectArea) {
                await initSelectArea()
                console.log("选择区已初始化");
                let one = await page.$$(currentSelector.detail.selectArea + " " + currentSelector.detail.item)
                console.log("O可选择数量", one.length);
                for (let i = 0; i < one.length; i++) {
                    await initSelectArea()
                    console.log("选择区已初始化");
                    let labelText
                    let prices = []
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
                            prices.push({
                                from: label2,
                                label: text,
                                price
                            })
                            if (platform === "京东") {
                                title = title.replace(/\\n/g, "").replaceAll(labelText, "")
                            }

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
            folderName = "./柚子/" + title || "错误" + "/"
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

async function exists(title) {
    console.log(title);
    return new Promise(resolve => {
        connection.query(
            "select * from tmall where title = ?",
            [title],
            async (err, result) => {
                length = result.length
                resolve();
            })
    })
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
    return new Promise(async (resolve, reject) => {
            await exists(title)
            if (length === 0) {
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
                        try {
                            Object.defineProperty(navigator, 'webdriver', {get: () => false})
                        } catch (e) {

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
                        await timeout("random");
                        await timeout("random");
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

request(url, true, false).then(r => console.log("结束"));
