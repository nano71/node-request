const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
})

function parse(string) {
    return parseInt(string) || 0
}

readline.question("爬取哪个? 0:淘宝 , 1:京东", (number) => {


})
readline.question("如何爬? 0:接口 , 1:puppeteer浏览器", (number) => {
})
readline.question("爬取期数? 输入[0-9]整数 , 自动补全年月", (number) => {
})
