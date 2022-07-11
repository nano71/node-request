const {connection} = require("./mysqlConnection");
const {randomID} = require("./randomID");
const md5 = require("md5");
let parser = {
    badData: [],
    errorData: [],
    list: [],
    canUpdate: true,
    regular: /\d*[.]?\d*[./-]?\d?[.]?\d*[公斤kg千克粒只][g克斤]?|\d+个/gi,
    regular2: /[小中特大]大?果|[特超]?[级大]?巨无霸/gi,
    regular3: /[三葡沙]?[萄红青蜜白西田金]柚/g,
    regular4: /\d*[g斤]?-\d*?[g斤]\/个|单[果颗个]/g,
    init(date) {
        return new Promise(async resolve => {
            await this.getList(date).then(res => this.list = res)
            await this.loopList()
            console.log(this.errorData);
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
        let data = this.list[index1]
        for (let item of specifications) {
            if (data.sales === "0") {
                break
            }
            item.price = item.prices || item.price
            delete item.prices
            let sourceData = JSON.stringify(item)
            if (this.regular4.test(sourceData)) {
                item.isMultiply = true
            }

            let string = sourceData.replaceAll(/[克G]/g, "g").replaceAll(/[g斤]-/gi, "-").replaceAll(/[只粒]/g, "个").replaceAll(" ", "")
            if (/\d[红白].+\d[红白]/g.test(string) && !string.includes("个")) {
                string += "共" + (int(string.match(/\d[红白]/g)[0][0]) * 2) + "个"
            }
            let array = string.match(this.regular)
            if (array) {
                let cache = []
                for (let i = 0; i < array.length; i++) {
                    let value = array[i]
                    if (value.includes("g") && int(value) < 10) {
                        continue
                    }
                    if (!cache.includes(value)) {
                        cache.push(value);
                    }
                }
                array = cache.filter(item => item !== undefined)
            } else {
                break
            }

            length = array.length
            if (length) {
                console.log(item);
                console.log(array);
                if (array.length >= 3) {
                    console.log(item);
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

                let that = this
                parseThree()

                function parseThree() {
                    if (length === 3) {

                        array = array.sort((x, y) => float(x) - float(y))
                        if (array[1].at(-1) === array[2].at(-1)) {
                            if (!item.isMultiply && float(array[2]) < float(array[1])) {
                                array[2] = array[1]
                            }
                            if (item.isMultiply && float(array[2]) > float(array[1])) {
                                array[2] = array[1]
                            }
                            array = [array[0], array[2]]
                            console.log(array);

                        } else if (array[1].at(-1) === "斤" && array[2].at(-1) === "g") {
                            array[1] = float(array[1].replace("斤", "")) * 500 + "g"
                            parseThree()
                            console.log(array);

                        } else if (array[0].at(-1) === array[2].at(-1)) {
                            console.log(item);
                            if (!item.isMultiply && float(array[2]) < float(array[0])) {
                                array[2] = array[0]
                            }
                            if (item.isMultiply && float(array[2]) > float(array[0])) {
                                array[2] = array[0]
                            }

                            array = [array[1], array[2]]
                            console.log(array);

                        } else if (array[0].at(-1) === "斤" && array[2].at(-1) === "g") {
                            array[0] = float(array[0].replace("斤", "")) * 500 + "g"
                            parseThree()
                            console.log(array);
                        }
                    }
                }

                console.log(array);

                if (i === -1) {
                    console.log("无重量|数据有误", item, array);
                    break
                }
                if (array.length === 1)
                    break
                else if (array.length === 2) {
                    this.canUpdate = false
                    if (data.id === "5SMn6KTbbrWMWB8HAXTSzcEH4342AEwk") {
                        array
                        data
                        item
                    }
                    if (!array.join().includes("个")) {
                        item.isMultiply = true
                        array[0] = this.getWeight(array[0])
                        array[1] = this.getWeight(array[1])
                        array = array.sort()
                        array.unshift(Math.floor(array.pop() / array[0]) + "个")
                        array[1] += "斤"
                        console.log(array);
                    }

                    for (let j = 0; j < array.length; j++) {
                        if (array[j].includes("个")) {
                            item.unitCount = int(array[j])
                            if (int(item.price) > 100 && item.unitCount <= 5) {
                                item.isMultiply = true
                            }
                            if (item.isMultiply) {
                                array = [array[Math.abs(j - 1)]]
                                item.unitWeight = this.getWeight(array[0]) + "斤"
                                item.weight = this.getWeight(array[0]) * float(item.unitCount) + "斤"
                            } else {
                                array = [this.getWeight(array[Math.abs(j - 1)]) + "斤"]
                                item.unitWeight = this.getWeight(array[0]) / float(item.unitCount) + "斤"
                                item.weight = this.getWeight(array[0]) + "斤"
                            }
                        }
                    }

                } else {
                    this.errorData.push(data)
                }

                if (this.getWeight(item.unitWeight) < 0.4) {
                    item.unitWeight = item.weight
                    item.weight = float(item.unitCount) * float(item.weight) + "斤"
                }

                let variety = item.label.match(this.regular3) || data.title.match(this.regular3)

                if (variety) {
                    item.variety = this.getVariety(data.title, variety).replace("泰国青柚", "泰国白心青柚")
                    item.size = this.getSize(item.variety, item.unitWeight)
                } else {
                    console.log(data);
                    console.log(data.title.match(this.regular3));
                    this.errorData.push(data)
                }
            }

            if (item.weight && item.unitWeight) {
                if (item.unitWeight.length > 5) {
                    let unit = item.unitWeight.at(-1)
                    item.unitWeight = float(item.unitWeight).toFixed(2) + unit
                }
                if (item.weight.length > 5) {
                    let unit = item.weight.at(-1)
                    item.weight = float(item.weight).toFixed(2) + unit
                }
                let object = {
                    id: randomID(),
                    sourceID: data.id,
                    uniqueID: data.uniqueID,
                    type: data.type,
                    title: data.title,
                    platform: data.platform,
                    specification: sourceData,
                    variety: item.variety,
                    weight: item.weight,
                    unitWeight: item.unitWeight,
                    unitPrice: this.getUnitPrice(item.price, item.weight),
                    unitCount: item.unitCount,
                    price: item.price,
                    size: item.size || "统货",
                }
                object.md5 = md5(object.specification + object.sourceID)
                this.canUpdate && await this.update(object)
            }
            console.log("next--------------------------------------------")
        }
    },
    sort(array) {
        return array.sort((x, y) => float(x) - float(y))
    },
    getMedian(array, replace) {
        return (float(array[0]) + float(array[1].replace(replace, ""))) / 2 + replace
    },
    getVariety(title, variety) {
        // console.log(variety);
        // variety.length > 1 && console.log(variety);
        variety[0] === "红柚" && (variety[0] = "红心柚")
        variety[0].includes("白柚") && (variety[0] = "蜜柚")
        if (/[蜜红金]/g.test(variety[0])) {
            return variety[0].replace("泰国", "")
        }
        return ((title.includes("泰国") && "泰国") || "") + variety[0]
    },
    getSize(variety, weight) {
        if (weight === "NaN斤") {
            return ""
        }
        let varietyList = ["蜜柚", "青柚", "泰国青柚", "金柚", "沙田柚", "葡萄柚", "三红柚", "红心柚", "西柚", "泰国白心青柚"]
        let i = varietyList.indexOf(variety)
        switch (i) {
            case 0:
            case 6:
            case 7:
                return this.variety1(weight)
            case 1:
            case 2:
            case 9:
                return this.variety2(weight)
            case 3:
            case 4:
                return this.variety3(weight)
            case 5:
            case 8:
                return this.variety4(weight)

        }
        let array = variety.match(this.regular2)
        return (array && array[0]) || "统货"
    },
    variety1(weight) {
        weight = float(weight)
        if (weight <= 2.3)
            return "小果"
        if (weight <= 2.7)
            return "中果"
        if (weight <= 3.3)
            return "大果"
        if (weight <= 4.15)
            return "特大果"
        return "巨无霸"
    },
    variety2(weight) {
        weight = float(weight)

        if (weight <= 2)
            return "小果"
        if (weight <= 2.4)
            return "中果"
        if (weight <= 2.8)
            return "大果"
        return "特大果"
    },
    variety3(weight) {
        weight = float(weight)

        if (weight <= 1.7)
            return "小果"
        if (weight <= 2.8)
            return "中果"
        if (weight <= 3.8)
            return "大果"
        return "特大果"
    },
    variety4(weight) {
        weight = float(weight)

        if (weight <= 0.5)
            return "小果"
        if (weight <= 0.6)
            return "中果"
        if (weight <= 0.7)
            return "大果"
        if (weight <= 0.84)
            return "特大果"
        if (weight <= 0.9)
            return "巨无霸"
        return "特大巨无霸"
    },
    getUnitPrice(price, number, isMultiply) {
        let unitPrice = price / float(number)
        return unitPrice.toFixed(2)
    },
    getWeight(number) {
        let units = ["斤", "g", "克", "kg"]
        let levels = [1, 500, 500, -0.5]
        let i = units.indexOf(number.at(-1))
        return float(number.replace(units[i], "")) / Math.abs(levels[i])
    },
    toFixed2(number) {
        return Math.round(number * 100) / 100
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
    return parseFloat(string.toString().replace(/[g斤个]/g, ""))
}

function int(string) {
    return parseInt(string.replace(/[g斤个]/g, ""))
}

parser.init(20220601).then(console.log)
// parser.init(20220701).then(console.log)
