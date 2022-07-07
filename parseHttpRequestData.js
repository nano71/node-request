const {connection} = require("./mysqlConnection");
let parser = {
    list: [],
    regular: /\d[.]?\d*[.-]?\d*[公斤kg千克][g克斤]?|\d*\/?[个粒只]/gi,
    init(date) {
        return new Promise(async resolve => {
            await this.getList(date).then(res => this.list = res)
            this.loopList()
            resolve("结束")
        })
    },
    getList(date) {
        return new Promise(resolve => {
            connection.query("select * from http_request.tmall where type = ?", [date],
                (error, result) => {
                    if (error)
                        throw new Error(error)
                    resolve(result)
                }
            )
        })
    },
    loopList() {
        for (let i = 0; i < this.list.length; i++) {
            this.list[i].specifications = JSON.parse(this.list[i].specifications)
            this.parseSpecifications(this.list[i].specifications)
        }
    },
    parseSpecifications(specifications) {
        for (let item of specifications) {
            console.log(item);
            let str = JSON.stringify(item)
            let array = str.match(this.regular)
            if (array) {
                delete array[array.indexOf("0g")]
                delete array[array.indexOf("1g")]
                array = array.filter(item => item !== undefined)
                console.log(array);

                if (array.length === 1) {
                    let a = array[0].split("-")
                    let units = ["斤", "g", "个", "粒", "只"]
                    let i = units.indexOf(a.at(-1).at(-1))
                    if (a.length > 1) {
                        array[0] = (float(a[0]) + float(a[1].replace(/[g斤]/g, ""))) / 2 + "斤"
                    }
                    console.log(array[0]);
                    if (i === 0 || i > 1) {
                        this.catty(item.price, array[0])
                    }
                    if (i === 1) {
                        this.gram(item.price, array[0])
                    }
                }
            }
        }
    },
    computeUnitPrice() {

    },
    catty(price, number) {
        let unitPrice = float(price) / float(number.replace("斤", ""))
        console.log("单价", unitPrice.toFixed(2));
    },
    gram(price, number) {
        let unitPrice = float(price) / float(number.replace("g", "")) / 500
        console.log("单价", unitPrice.toFixed(2));
    },
    single(price, number) {
        let unitPrice = float(price) / float(number.replace("g", "")) / 500
        console.log("单价", unitPrice.toFixed(2));
    }
}

function float(string) {
    return parseFloat(string)
}

function int(string) {
    return parseInt(string)
}

parser.init(20220701).then(console.log)
