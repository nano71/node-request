const {connection} = require("./mysqlConnection");
const {randomID} = require("./randomID");
const md5 = require("md5");
let parser = {
    list: [],
    regular: /\d[.]?\d*[./-]?\d*[公斤kg千克个粒只][g克斤]?/gi,
    regular2: /[小中特大]大?果|[特超]?[级大]?巨无霸/gi,
    regular3: /[三葡]?[萄红青蜜白西]柚/g,
    init(date) {
        return new Promise(async resolve => {
            await this.getList(date).then(res => this.list = res)
            await this.loopList()
            resolve("结束")
        })
    },
    getList(date) {
        return new Promise(resolve => {
            connection.query("select * from http_request.tmall where type = ? and sales > 0", [date],
                (error, result) => {
                    if (error)
                        throw new Error(error)
                    resolve(result)
                }
            )
        })
    },
    async loopList() {
        for (let i = 0; i < this.list.length; i++) {
            this.list[i].specifications = JSON.parse(this.list[i].specifications)
            await this.parseSpecifications(this.list[i].specifications, i)
        }
    },
    async parseSpecifications(specifications, index1) {
        for (let item of specifications) {
            let sourceData = JSON.stringify(item)
            let str = JSON.stringify(item).replaceAll(/[克G]/g, "g").replaceAll(/[g斤]-/g, "-").replaceAll(/[只粒]/g, "个")
            let array = str.match(this.regular)
            if (array) {
                delete array[array.indexOf("0g")]
                delete array[array.indexOf("1g")]
                let cache = []
                array.forEach((value) => {
                    if (!cache.includes(value)) {
                        cache.push(value);
                    }
                })
                array = cache.filter(item => item !== undefined)
            } else {
                break
            }
            length = array.length
            if (length) {
                parseThree()

                function parseThree() {
                    if (length === 3) {
                        array = array.sort((x, y) => float(x) - float(y))
                        if (array[1].at(-1) === array[2].at(-1)) {
                            array = [array[0], array[2]]
                        } else if (array[1].at(-1) === "斤" && array[2].at(-1) === "g") {
                            array[1] = float(array[1].replace("斤", "")) * 500 + "g"
                            parseThree()
                        } else if (array[0].at(-1) === array[2].at(-1)) {
                            array = [array[1], array[2]]
                        } else if (array[0].at(-1) === "斤" && array[2].at(-1) === "g") {
                            array[0] = float(array[0].replace("斤", "")) * 500 + "g"
                            parseThree()
                        }
                    }
                }

                let units = ["斤", "g", "克", "个", "粒", "只"], i = units.indexOf(array.at(-1).at(-1))
                for (let index = 0; index < array.length; index++) {
                    const value = array[index].toLowerCase();
                    let a = (value.split("/").length > 1 && value.split("/")) || value.split("-")
                    if (a.length > 1) {
                        i = units.indexOf(a.at(-1).at(-1))
                        array[index] = this.getMedian(a, units[i])
                        break
                    }
                }
                if (i === -1) {
                    console.log("无重量|数据有误", item, array);
                    break
                }
                if (array.length === 1) {
                    if (array[0].at(-1) === "个")
                        item.unitCount = ""
                    if (i === 0) {
                        item.unitPrice = this.catty(item.price, array[0])
                    }
                    if (i === 1 || i === 2) {
                        item.unitPrice = this.gram(item.price, array[0])
                    }
                } else if (array.length === 2) {
                    for (let j = 0; j < array.length; j++) {
                        if (array[j].includes("个")) {
                            item.unitCount = array[j]
                            i = units.indexOf(array[Math.abs(j - 1)].at(-1))
                            array = [float(array[j].replace("个", "")) * float(array[Math.abs(j - 1)].replace(units[i], "")) + units[i]]
                        }
                    }
                    if (i === 0) {
                        item.unitPrice = this.catty(item.price, array[0])
                    }
                    if (i === 1 || i === 2) {
                        item.unitPrice = this.gram(item.price, array[0])
                    }
                }
                item.unitCount && (item.unitWeight = this.getWeight(array[0]) / float(item.unitCount.replace(item.unitCount.at(-1), "")).toFixed(2) + "斤");
                item.weight = this.getWeight(array[0]) + "斤"

                let variety = item.label.match(this.regular3) || this.list[index1].title.match(this.regular3)
                // if (variety && /葡萄/g.test(variety.toString())) {
                //     console.log(item);
                //     console.log(variety);
                // }
                if (variety) {
                    // console.log(this.list[index1].title);
                    item.variety = this.getVariety(this.list[index1].title, variety).replace("泰国青柚", "泰国白心青柚")
                    item.size = this.getSize(item.variety, item.unitWeight)
                    // console.log(item);
                }
                if (array.length > 2) {
                    console.log(this.list[index1]);
                    console.log("数据有误", item);
                    console.log(array);
                }
                if (item.weight === "NaN斤" && array && array[0].at(-1) === "个" && this.list[index1].sales !== "0") {
                    item.unitCount = array[0]
                    console.log("数据有误", item);
                    console.log(array);
                }
            }
            let data = this.list[index1]
            if (item.weight && item.unitWeight) {
                if (item.unitWeight.length > 5) {
                    let unit = item.unitWeight.at(-1)
                    item.unitWeight = float(item.unitWeight.replace(unit, "")).toFixed(2) + unit
                }
                if (item.weight.length > 5) {
                    let unit = item.weight.at(-1)
                    item.weight = float(item.weight.replace(unit, "")).toFixed(2) + unit
                }
                if (item.unitCount.includes(".")) {
                    let unit = item.unitCount.at(-1)
                    item.unitCount = Math.floor(int(item.unitCount.replace("个", ""))) + unit
                }
                let object = {
                    id: randomID(),
                    sourceID: data.id,
                    uniqueID: data.uniqueID,
                    type: data.type,
                    title: this.list[index1].title,
                    platform: this.list[index1].platform,
                    specification: sourceData,
                    variety: item.variety,
                    weight: item.weight,
                    unitWeight: item.unitWeight,
                    unitPrice: item.unitPrice,
                    unitCount: item.unitCount,
                    price: item.price,
                    size: item.size || "统货",
                }
                object.md5 = md5(object.specification + object.sourceID)
                await this.update(object)
            }
        }
    }
    ,
    sort(array) {
        return array.sort((x, y) => float(x) - float(y))
    }
    ,
    getMedian(array, replace) {
        return (float(array[0]) + float(array[1].replace(replace, ""))) / 2 + replace
    }
    ,
    getVariety(title, variety) {
        // variety.length > 1 && console.log(variety);
        variety[0] === "红柚" && (variety[0] = "红心柚")
        variety[0].includes("白柚") && (variety[0] = "蜜柚")
        if (/[蜜红]/g.test(variety[0])) {
            return variety[0]
        }
        return ((title.includes("泰国") && "泰国") || "") + variety[0]
    }
    ,
    getSize(variety, weight) {
        if (weight === "NaN斤") {
            return ""
        }
        let varietyList = ["蜜柚", "青柚", "泰国青柚", "金柚", "沙田柚", "葡萄柚", "三红柚", "红心柚", "西柚"]
        let i = varietyList.indexOf(variety)
        i === -1 && console.log(variety, i);
        switch (i) {
            case 0:
            case 6:
            case 7:
                return this.variety1(weight)
            case 1:
            case 2:
                return this.variety2(weight)
            case 3:
            case 4:
                return this.variety3(weight)
            case 5:
            case 8:
                return this.variety4(weight)

        }
        let array = variety.match(this.regular2)
        return (array && array[0]) || "标准"
    }
    ,
    variety1(weight) {
        if (weight <= "2.3")
            return "小果"
        if (weight <= "2.7")
            return "中果"
        if (weight <= "3.3")
            return "大果"
        if (weight <= "4.15")
            return "特大果"
        return "巨无霸"
    }
    ,
    variety2(weight) {
        if (weight <= "2")
            return "小果"
        if (weight <= "2.4")
            return "中果"
        if (weight <= "2.8")
            return "大果"
        return "特大果"
    }
    ,
    variety3(weight) {
        if (weight <= "1.7")
            return "小果"
        if (weight <= "2.8")
            return "中果"
        if (weight <= "3.8")
            return "大果"
        return "特大果"
    }
    ,
    variety4(weight) {
        if (weight <= "0.5")
            return "小果"
        if (weight <= "0.6")
            return "中果"
        if (weight <= "0.7")
            return "大果"
        if (weight <= "0.84")
            return "特大果"
        if (weight <= "0.9")
            return "巨无霸"
        return "特大巨无霸"
    },
    variety5(weight) {
        if (weight <= "0.5")
            return "小果"
        if (weight <= "0.6")
            return "中果"
        if (weight <= "0.7")
            return "大果"
        if (weight <= "0.84")
            return "特大果"
        if (weight <= "0.9")
            return "巨无霸"
        return "特大巨无霸"
    }
    ,
    catty(price, number) {
        let unitPrice = float(price) / float(number.replace("斤", ""))
        price = unitPrice.toFixed(2)
        return price
    }
    ,
    gram(price, number) {
        let unitPrice = float(price) / (float(number.replace("g", "")) / 500)
        price = unitPrice.toFixed(2)
        return price
    },
    getWeight(number) {
        let units = ["斤", "g", "克", "kg"]
        let levels = [1, 500, 500, -0.5]
        let i = units.indexOf(number.at(-1))
        return float(number.replace(units[i], "")) / Math.abs(levels[i])
    },
    update(object) {
        return new Promise(async resolve => {
                let result
                await this.exist(object.md5).then(r => result = r)
                if (result) {
                    console.log("重复");
                    return resolve()
                }
                let sql = "INSERT INTO http_request.pomelo_tidied_data (" + Object.keys(object).toString().replaceAll("'", "")
                    + ") VALUES ('" + Object.values(object).join("','") + "');"
                // console.log(sql);
                connection.query(sql,
                    [],
                    (error, result) => {
                        if (error) {
                            // console.log(object)
                            throw new Error(error)
                        }
                        resolve(result)
                    }
                )
            }
        )
    },
    exist(md5) {
        return new Promise(resolve => {
            connection.query("select md5 from http_request.pomelo_tidied_data where md5 = ?", [md5], (error, result) => {
                if (error) throw  new Error(error)
                resolve(result.length)
            })
        })

    }
}

function float(string) {
    return parseFloat(string)
}

function int(string) {
    return parseInt(string)
}

// parser.init(20220601).then(console.log)
parser.init(20220701).then(console.log)
