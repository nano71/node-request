const {connection} = require("../mysql/mysqlConnection");
const {randomID} = require("../utils/randomID");
const md5 = require("md5");
const {timeout} = require("../utils/timeout");

module.exports.parser = {
    badData: [],
    errorData: [],
    errorDataInfo: [],
    list: [],
    canInset: true,
    canTimeout: false,
    regular: /\d*[.]?\d+[g克斤]?[./-]?\d?[.]?\d+[公斤kg千克粒只][g克斤]?|\d+个/gi,
    regular2: /[小中特大]大?果|[特超]?[级大]?巨无霸/gi,
    regular3: /(泰国白心)?[三葡沙白]?[萄红青蜜白西田金心]柚/g,
    regular4: /\d*[g斤]?-\d*?[g斤]\/个|单[果颗个]/g,
    regular5: /柚子[酱皮饮茶叶汁籽核仁]/g,
    regular6: /[总共]重?/g,
    regular7: /\d[红白].+\d[红白]/g,
    regular8: /\d[红白]/g,
    weightWords: ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"],
    init(date) {
        return new Promise(async resolve => {
            console.log(date);
            console.log("开始");
            await this.getList(date).then(res => this.list = res)
            await this.loopList()
            console.log("错误数据数量", this.errorData.length);
            console.log("错误数据", this.errorData[10]);
            console.log("错误数据信息", this.errorDataInfo[10]);
            resolve("结束")
        })
    },
    getList(date) {
        return new Promise(resolve => {
            console.log("getList");
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
        console.log("loopList");
        let data = i => this.list[i]
        for (let i = 0; i < this.list.length; i++) {
            console.log("i", i, data(i).uniqueID);
            if (data(i).sales === "0" || this.regular5.test(data(i).title)) continue
            this.list[i].specifications = JSON.parse(this.list[i].specifications)
            await this.parseSpecifications(this.list[i].specifications, data(i))
        }
    },
    parseSourceData(sourceData) {
        for (let i = 0; i < this.weightWords.length; i++) {
            let word = this.weightWords[i]
            let index = sourceData.indexOf(word + "两")
            if (index !== -1) {
                sourceData.replace(word + "两", i * 50 + 50 + "g")
            }
        }
        return sourceData
            .replaceAll("斤到", "斤-")
            .replaceAll("g到", "g-")
            .replaceAll("一斤", "1斤")
            .replaceAll(/半?斤到/g, "250g-")
            .replaceAll("半斤", "250g")
            .replaceAll(/[克G]/g, "g")
            .replaceAll(/[只粒]/g, "个")
            .replaceAll(")斤", "斤")
            .replaceAll(" ", "")
            .replaceAll(/\D-/g, "")
            .replaceAll("--", "-")
    },
    async parseSpecifications(specifications, data) {
        for (let item of specifications) await this.parseSpecification(item, data)
    },
    async parseSpecification(item, data) {
        return new Promise(async resolve => {
            await this.update(data.url, data.uniqueID)
            return resolve()
            this.canTimeout && await timeout(500, "")
            console.log("parseSpecification");
            item.price = item.prices || item.price
            delete item.prices
            let sourceData = JSON.stringify(item)
            let string = this.parseSourceData(sourceData)
            let array = string.match(this.regular)

            let cache = []
            let isMultiply = false
            if (!array)
                return resolve()
            if (this.regular7.test(string) && !string.includes("个"))
                string += "共" + (int(string.match(this.regular8)[0][0]) * 2) + "个"
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
            string.match(this.regular4) && (isMultiply = true)
            console.log("source", array);
            if (array.length === 3 && isMultiply) {
                !array[0].includes("个") && array.shift()
            }
            array = this.getMedian(array)
            array = this.parseThree(array, isMultiply)
            console.log("parse end", array);
            if (!array || array.length !== 2 || (array[0].includes("个") && array[1].includes("个"))) {
                this.errorData.push(data)
                this.errorDataInfo.push("数据模糊 - " + array + " - " + item.label)
                return resolve()
            }
            if (!array.join().includes("个")) {
                isMultiply = true
                array[0] = this.getWeight(array[0])
                array[1] = this.getWeight(array[1])
                array = array.sort((x, y) => float(x) - float(y))
                array.unshift(Math.floor(array.pop() / array[0]) + "个")
                array[1] += "斤"
                console.log(array);
            }

            for (let j = 0; j < array.length; j++) {
                if (array[j].includes("个")) {
                    item.unitCount = int(array[j])
                    int(item.price) > 100 && item.unitCount > 3 && this.getWeight(array[0]) < 5 && (isMultiply = true)
                    this.regular6.test(sourceData) && (isMultiply = false)

                    if (isMultiply) {
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

            if (this.getWeight(item.unitWeight) < 0.4) {
                item.unitWeight = item.weight
                item.weight = float(item.unitCount) * float(item.weight) + "斤"
            }

            let variety = item.label.match(this.regular3) || data.title.match(this.regular3) || data.ext.match(this.regular3) || (data.title.includes("泰国") && "泰国白心青柚")

            if (variety) {
                item.variety = this.getVariety(data.title, variety).replace("泰国青柚", "泰国白心青柚")
                item.size = this.getSize(item.variety, item.unitWeight)
            } else {
                this.errorData.push(data)
                this.errorDataInfo.push("品种识别失败")
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
                    url: data.url,
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
                this.canInset && await this.inset(object)
                console.log(object);
            }
            console.log("next--------------------------------------------")
            return resolve()

        })
    },
    sort(array) {
        return array.sort((x, y) => float(x) - float(y))
    },
    parseThree(array, isMultiply) {
        if (array.length === 3) {
            console.log("parseThree");
            array = array.sort((x, y) => float(x) - float(y))
            if (array[1].at(-1) === array[2].at(-1)) {
                if (!isMultiply && float(array[2]) < float(array[1]) || isMultiply && float(array[2]) > float(array[1]))
                    array[2] = array[1]
                array = [array[0], array[2]]
            } else if (array[1].at(-1) === "斤" && array[2].at(-1) === "g") {
                array[1] = float(array[1].replace("斤", "")) * 500 + "g"
                return this.parseThree(array, isMultiply)
            } else if (array[0].at(-1) === array[2].at(-1)) {
                if (!isMultiply && float(array[2]) < float(array[0]) || isMultiply && float(array[2]) > float(array[0]))
                    array[2] = array[0]
                array = [array[1], array[2]]
            } else if (array[0].at(-1) === "斤" && array[2].at(-1) === "g") {
                array[0] = float(array[0].replace("斤", "")) * 500 + "g"
                return this.parseThree(array, isMultiply)
            }
        }
        return array
    },
    getMedian(array) {
        for (let i = 0; i < array.length; i++) {
            const value = array[i].toLowerCase();
            let a = (value.split("/").length > 1 && value.split("/")) || value.split("-")
            if (a.length > 1) {
                let unit
                for (let j = 0; j < a.length; j++) {
                    unit = array[i].at(-1)
                    if (/[斤克k]g?/g.test(a[j].at(-1)))
                        unit = a[j].at(-1)
                    a[j] = this.getWeight(a[j] + unit)
                }
                array[i] = ((float(a[0]) + float(a[1])) / 2).toFixed(2) + "斤"
                return array
            }
        }
        return array
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
    inset(object) {
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
    update(url, uniqueID) {
        return new Promise(resolve => {
            connection.query("update pomelo_tidied_data set url = ? where uniqueID = ? and url is null ", [url, uniqueID], (errors, result) => {
                if (errors) throw  new Error(errors)
                resolve(result)
            })
        })
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

// parser.init(20220601).then(console.log)

