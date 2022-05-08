let https = require("https");

let fs = require("fs");

let cheerio = require("cheerio");
let iconv = require('iconv-lite');
let BufferHelper = require('bufferhelper');
const mysql = require("mysql");
const {raw} = require("mysql");
const {get} = require("cheerio/lib/api/traversing");
//创建链接池
let connection = mysql.createPool({
    host: "121.37.198.222",
    port: "3306",
    user: "root",
    password: "14dfc14b652ae6cf",
    database: "redsns_platf", //使用的数据库
    connectionLimit: "20" //设置连接池的数量
});
let index = 0;

function insert({name, title, gameVersion, starScore, gameSize, icon, face, imgs, commentCount, desc, updateTime}) {
    console.log({name, title, gameVersion, starScore, gameSize, icon, face, imgs, commentCount, desc, updateTime});

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
                                               gameDesc)
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
                                 "${desc}");`,
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

const url = "https://www.3839.com/top/hot.html";
const urls = [
    "https://www.3839.com/xinqi.html"
];
let current = 0;
let hrefCache = "";
request(urls[current]);

function getUrl(node) {
    return node.attribs.href || node.attribs.src
}

function getText(node) {
    // console.log(node);
    if (node) {
        return node.children[0].data
    } else {
        return ""
    }
}

let gameData = {
    name: "",
    title: "",
    icon: "",
    face: "",
    imgs: "",
    desc: "",
    starScore: ""
};
let gameDataList = [];

function request(url) {

    console.log("request");
    let bufferHelper = new BufferHelper();
    try {
        https.get(url, function callback(res) {
            res.on("data", (chunk) => {
                bufferHelper.concat(chunk);
            });
            res.on("end", () => {
                let html = iconv.decode(bufferHelper.toBuffer(), 'UTF-8');
                let $ = cheerio.load(html);
                // let elements = $("#list > li .gameInfo .name > a");
                let elements = $("a[href^='//www.3839.com/a/']");
                console.log("数据数量", elements.length);
                let k = 0;

                async function cache(i) {
                    await raw(i, elements[i]);
                    setTimeout(() => {
                        cache(k)
                    }, 1000)
                }

                cache(k);

                function raw(i, element) {
                    if (i === elements.length) {
                        current++;
                        if (current >= urls.length) {
                            console.log("结束");
                            return
                        }
                        request(urls[current]);
                        return
                    }
                    return new Promise(async (resolve, reject) => {
                        gameDataList.push(gameData);
                        if (hrefCache !== element.attribs.href) {
                            console.log(i);
                            hrefCache = element.attribs.href;
                            await nextRequest(element.attribs.href, i);
                            console.log("进度: " + index / elements.length * 100 + "%");
                            console.log("cache end");
                        }
                        index++;
                        k++;
                        resolve()
                    })
                }

                function nextRequest(url, i) {
                    return new Promise((resolve, reject) => {
                        let bufferHelper = new BufferHelper();
                        try {
                            https.get("https:" + url, function callback(res) {
                                res.on("data", (chunk) => {
                                    bufferHelper.concat(chunk);
                                });
                                res.on("end", async () => {
                                    let html = iconv.decode(bufferHelper.toBuffer(), 'UTF-8');
                                    let $ = cheerio.load(html);
                                    let tags = $(".gameDeta .tag a");
                                    let name = $('h1.name')[0];
                                    let desc = $('.tithd.cf:contains("游戏介绍")').next().children().children()[0];
                                    let gameVersion = $("td:contains('游戏版本')")[0];
                                    let updateTime = $("td:contains('更新时间')")[0];
                                    let gameSize = $("td:contains('大小')")[0];
                                    let commentCount = $("#game_pj p.num:contains('人')")[0];
                                    // console.log(commentCount);
                                    gameDataList[i].name = getText(name);
                                    gameDataList[i].desc = getText(desc);
                                    gameDataList[i].icon = "https:" + getUrl($(".gameDesc > img")[0]);
                                    gameDataList[i].starScore = getText($("p.score")[0]).replace(".", "");
                                    gameDataList[i].gameVersion = getText(gameVersion)
                                        .replace("AndroidM3839First_", "")
                                        .replace("游戏版本：", "")
                                        .trim();
                                    gameDataList[i].updateTime = new Date(getText(updateTime)
                                        .replace("更新时间：", "")
                                        .replace("-", "/")
                                        .trim()
                                    ).getTime();
                                    gameDataList[i].gameSize = getText(gameSize).replace("大小：", "").trim();
                                    gameDataList[i].commentCount = getText(commentCount).replace("人", "").trim();
                                    let tagsList = [], imageList = [], images = $(".img-slider li > a");
                                    tags.each((i, element) => {
                                        tagsList.push(getText(element));
                                    });
                                    gameDataList[i].typeNames = tagsList.toString();
                                    images.each((i, element) => {
                                        if (getUrl(element).indexOf("http") === -1) {
                                            imageList.push("https:" + getUrl(element));
                                            if (i === 0) {
                                                gameDataList[i].face = "https:" + getUrl(element);
                                            }
                                        } else {
                                            imageList.push(getUrl(element));
                                            if (i === 0) {
                                                gameDataList[i].face = getUrl(element);
                                            }
                                        }

                                    });
                                    gameDataList[i].imgs = imageList.toString();
                                    await insert(gameDataList[i]);
                                    resolve()
                                });
                            })
                        } catch (e) {
                            console.log(e);
                        }
                    })
                }
            });
        });


    } catch (e) {
        window.console.log(e);
    }
}


