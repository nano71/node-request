const {getType} = require("./utils/getType");
const {parser} = require("./pomelo/parseHttpRequestData");
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
})
let nano71 = {
    start(index) {
        if (index === 0) {
            readline.question("\n要解析的期数? \n如" + getType() + "\ninput: ", (number) => {
                if (number.length !== 8 || number.indexOf("20") !== 0) {
                    console.log("\n格式有误")
                    return this.start(0)
                }
                parser.init(number).then(console.log)
            })
        }
    }
}
console.log("程序运行开始 , 请输入数字 , 然后回车");

nano71.start(0)
