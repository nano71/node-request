const {getType} = require("./utils/getType");
const {tmall} = require("./pomelo/tmallHttpRequest2");
const {jd} = require("./pomelo/jdHttpRequest");
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
})

let start = {
    init() {
        console.log("程序运行开始 , 请输入数字 , 然后回车");
        this.next(0)
    },
    next(index) {
        switch (index) {
            case 0:
                return readline.question("\n爬取期数? \n如" + getType() + "\ninput: ", (number) => {
                    if (number.length !== 8 || number.indexOf("20") !== 0) {
                        console.log("\n格式有误")
                        return this.next(0)
                    }
                    global.period = number
                    this.next(1)
                })
            case 1:
                return readline.question("\n爬取哪个? \n0:淘宝/天猫 , 1:京东 \ninput: ", (number) => {
                    if (number.length === 0) {
                        console.log("\n不能为空")
                        return this.next(1)
                    }
                    if (parse(number)) {
                        this.next(2)
                    } else {
                        tmall.start(1, 100).then(console.log)
                    }
                })
            case 2:
                return readline.question("\n如何爬? \n0:纯接口 , 1:接口和puppeteer浏览器\ninput: ", (number = 0) => {
                    if (parse(number)) {
                        jd.getUrls().then(console.log)
                    } else {
                        jd.start(1, 100).then(console.log)
                    }
                })
        }

    }
}

function parse(string) {
    return parseInt(string) || 0
}


start.init()
