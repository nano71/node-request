const { getType } = require("./utils/getType");
const parser = require("./pomelo/parseHttpRequestData");
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
})
let nano71 = {
    start(index) {
        if (index === 0) {
            readline.question("\n要解析的期数? \n如" + getType() + "\ninput: ", (number) => {
                if (number === "") {
                    return this.loop()
                }
                if (number.length !== 8 || number.indexOf("20") !== 0) {
                    console.log("\n格式有误")
                    return this.start(0)
                }
                parser.init(number).then(console.log)
            })
        }
    },
    async loop() {
        for (let i = 1; i <= 12; i++) {
            let m = i.toString()
            if (m < 10) {
                m = "0" + m
            }
            for (let j = 1; j <= 4; j++) {
                // console.log(new Date().getFullYear() + m + "0" + j);
                await parser.init(new Date().getFullYear() + m + "0" + j).then(console.log)
            }
        }
        process.exit()
    }
}
console.log("程序运行开始 , 请输入数字 , 然后回车");

nano71.start(0)
