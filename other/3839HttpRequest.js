let https = require("https");
let cheerio = require("cheerio");
let iconv = require('iconv-lite');
let BufferHelper = require('bufferhelper');
const mysql = require("mysql");
const {timeout} = require("../utils/timeout");
//创建链接池
let connection = mysql.createPool({
    host: "121.37.198.222",
    port: "3306",
    user: "root",
    password: "14dfc14b652ae6cf",
    database: "redsns_platf", //使用的数据库
    connectionLimit: "20" //设置连接池的数量
});
connection = mysql.createPool({
    host: "localhost",
    port: "3306",
    user: "root",
    password: "123456",
    database: "http_request", //使用的数据库
    connectionLimit: "20" //设置连接池的数量
});

let nano71 = {
    urls: [
        "https://www.3839.com/xinqi.html"
    ],
    init() {
        return new Promise(async resolve => {
            this.initUrls()
            for (let url of this.urls)
                await this.getDataUrl(url)
            resolve("结束")
            process.exit()
        })
    },
    initUrls() {
        for (let i = 1; i < 300; i++) {
            this.urls.push(`https://www.3839.com/fenlei/cat_${i}.html`)
        }
    },
    getDataUrl(url) {
        return new Promise(async resolve => {
            console.log("request", url);
            let bufferHelper = new BufferHelper();
            await https.get(url, res => {
                console.log("get");
                res.on("data", (chunk) => {
                    bufferHelper.concat(chunk);
                })
                res.on("end", async () => {
                    let html = iconv.decode(bufferHelper.toBuffer(), 'UTF-8');
                    let $ = cheerio.load(html);
                    let elements = $("a[href^='//www.3839.com/a/']");
                    console.log("数据数量", elements.length);
                    let cacheList = []
                    for (let key in elements)
                        if (!isNaN(parseInt(key))) {
                            let url = elements[key].attribs.href.replace(/https?:\/\/|\/\//gi, "")
                            !cacheList.includes(url) && cacheList.push(url)
                        }
                    for (let url of cacheList) {
                        let i = cacheList.indexOf(url)
                        console.log(i, url);
                        await exist(url).then(async exist => !exist && await this.getDetail(url))
                        console.log("进度: " + i / cacheList.length * 100 + "%");
                    }
                    resolve()
                })
            })
        })
    },
    getDetail(url, i) {
        return new Promise((resolve, reject) => {
            https.get("https:" + url, res => {
                let bufferHelper = new BufferHelper();
                res.on("data", (chunk) => {
                    bufferHelper.concat(chunk);
                })
                res.on("end", async () => {
                    let gameDetail = {
                        name: "",
                        title: "",
                        icon: "",
                        face: "",
                        imgs: "",
                        desc: "",
                        starScore: "",
                        gameTypeids: []
                    }
                    let html = iconv.decode(bufferHelper.toBuffer(), 'UTF-8');
                    let $ = cheerio.load(html);
                    let tags = $(".gameDeta .tag a");
                    let name = $('h1.name')[0];
                    let desc = $('.tithd.cf:contains("游戏介绍")').next().children().children()[0];
                    let gameVersion = $("td:contains('游戏版本')")[0];
                    let updateTime = $("td:contains('更新时间')")[0];
                    let gameSize = $("td:contains('大小')")[0];
                    let commentCount = $("#game_pj p.num:contains('人')")[0];
                    let icon = $(".gameDesc > img")[0]
                    // console.log(commentCount);
                    gameDetail.url = url
                    gameDetail.name = getText(name);
                    gameDetail.desc = getText(desc);
                    gameDetail.icon = "https:" + getUrl(icon);
                    if (!getUrl(icon).length) {
                        console.log("无icon");
                        return resolve()
                    }
                    gameDetail.starScore = getText($("p.score")[0]).replace(".", "");
                    gameDetail.gameVersion = getText(gameVersion)
                        .replace("AndroidM3839First_", "")
                        .replace("游戏版本：", "")
                        .trim();
                    gameDetail.updateTime = new Date(getText(updateTime)
                        .replace("更新时间：", "")
                        .replace("-", "/")
                        .trim()
                    ).getTime();
                    gameDetail.gameSize = getText(gameSize).replace("大小：", "").trim();
                    gameDetail.commentCount = getText(commentCount).replace("人", "").trim();
                    let imageList = [], images = $(".img-slider li > a");
                    await parseType(tags).then(r => gameDetail.typeids = r.toString())
                    images.each((i, element) => {
                        let url = getUrl(element)
                        if (url) if (url.indexOf("http") === -1) {
                            imageList.push("https:" + getUrl(element));
                            if (i === 0) {
                                gameDetail.face = "https:" + getUrl(element);
                            }
                        } else {
                            imageList.push(getUrl(element));
                            if (i === 0) {
                                gameDetail.face = getUrl(element);
                            }
                        }
                    })
                    gameDetail.imgs = imageList.toString();
                    await timeout(2000, "")
                    await insert(gameDetail);
                    resolve()
                })
            })
        })
    }
}

function insert({
                    name,
                    title,
                    gameVersion,
                    starScore,
                    gameSize,
                    icon,
                    face,
                    imgs,
                    commentCount,
                    desc,
                    updateTime,
                    typeids,
                    url
                }) {
    console.log({
        name,
        title,
        gameVersion,
        starScore,
        gameSize,
        icon,
        face,
        imgs,
        commentCount,
        desc,
        updateTime,
        typeids,
        url
    });
    return new Promise((resolve, reject) => {
        connection.query(
            "select * from gameinfo where gameName = ?",
            [name, 'china'],
            (err, result) => {
                if (result.length === 0) {
                    console.log("开始添加");
                    connection.query(
                        `INSERT INTO gameinfo (gameName,
                                               gameTitle,
                                               gameVersion,
                                               starScore,
                                               gameSize,
                                               commentCount,
                                               gameIconUrl,
                                               gameFaceUrl,
                                               gameImgUrls,
                                               updateTime,
                                               gameDesc,
                                               gameTypeids,
                                               url)
                         VALUES ("${name}",
                                 "${title || desc}",
                                 "${gameVersion}",
                                 "${starScore}",
                                 "${gameSize}",
                                 "${commentCount}",
                                 "${icon}",
                                 "${face}",
                                 "${imgs}",
                                 "${updateTime}",
                                 "${desc}",
                                 "${typeids}",
                                 "${url}");`,
                        (err, result) => {
                            if (err) {
                                throw err;
                            }
                        }
                    );
                } else {
                    console.log("已存在");
                }
            }
        );
        resolve();
    })
}


function getUrl(node) {
    try {
        return node.attribs.href || node.attribs.src
    } catch (e) {
        return ""
    }
}

function getType(string) {
    return new Promise(resolve => {
        connection.query("select gameTypeid from gametype where gameTypeName = ?", [string], (error, result) => {
            if (error)
                throw new Error(error)
            if (result.length) {
                return resolve(result[0]["gameTypeid"])
            }
            return resolve("")
        })
    })
}


function getText(node) {
    // console.log(node);
    if (node) {
        try {
            return node.children[0].data.replaceAll('"', "")
        } catch (e) {
            return ""
        }
    } else {
        return ""
    }
}


function parseType(array) {
    if (array["0"] === undefined)
        return ""
    let tagsList = []
    return new Promise(async resolve => {
        array.each(async (i, element) => {
            let type
            await getType(getText(element)).then(r => type = r)
            tagsList.push(type)
            if (tagsList.length === array.length) {
                resolve(tagsList)
            }
        });
    })
}

function exist(url) {
    return new Promise(resolve => {
        connection.query("select * from gameinfo where url = ?", [url], (errors, result) => {
            if (errors)
                throw new Error(errors)
            if (result.length) console.log("已存在")
            return resolve(!!result.length)
        })
    })
}

nano71.init().then(console.log)
