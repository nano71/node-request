const axios = require("axios")
const {randomID} = require("./randomID");
const {connection, exists} = require("./mysqlConnection");
const md5 = require("md5");
const {timeout} = require("./timeout");
const {getType} = require("./getType");
let type = 1
let request = {
    async start(start = 1, max) {
        for (let i = start; i < max; i++) {
            await request.get(i)
        }
    },

    getDate(date) {
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:00`
    },
    getVariety(data) {
        if (data && data.length === 1) {
            if (data[0].includes("柚")) {
                return data[0]
            }
        }
    },
    setInformation(list) {
        let data = {}
        for (let item of list) {
            data.originCountry || (data.originCountry = item["产地"] || item["商品产地"] || item["原产地"] || "")
            data.originProvince || (data.originProvince = item["省份"] || "")
            data.originAddress || (data.originAddress = item["城市"] || "")
            data.variety || (data.variety = item["特产品类"] || item["水果种类"] || item["品种"] || item["种类"] || "")
        }
        return [data.originCountry, data.originProvince, data.originAddress, data.variety]
    },
    get(page) {
        return new Promise(async resolve => {
            console.log("第" + page + "页");
            let baseUrl = "http://162.14.108.171:10006"
            let path = "/taobao/page/search?"
            let token = "bba230047f08154bbecb5a066b0228f3"
            await axios.get(baseUrl + path + `q=%E6%9F%9A%E5%AD%90&page=${page}&sort=_sale&token=` + token).then(async res => {
                console.log("列表获取成功");
                let goodsList
                try {
                    goodsList = res.data.data.itemsArray
                } catch (e) {
                    console.log(res.data);
                    return
                }
                await timeout(2000)
                for (let item of goodsList) {
                    if (!item["item_id"]) {
                        console.log("无商品ID,跳过");
                        continue
                    }
                    let hasExists = false
                    await exists(item["item_id"], type).then(res => hasExists = res)
                    if (hasExists) {
                        console.log("数据已经存在", item["item_id"]);
                        continue
                    }
                    let date = new Date()
                    let data = {
                        id: randomID(),
                        type: getType(type),
                        url: item["auctionURL"],
                        uniqueID: item["item_id"],
                        keyword: "柚子",
                        title: item["title"],
                        time: this.getDate(date),
                        platform: "淘宝",
                        shop: null,
                        originCountry: "",
                        originProvince: "",
                        originAddress: "",
                        variety: this.getVariety(),
                        specifications: [],
                        sales: item["realSales"]?.replace("人累计付款", ""),
                        face: item["pic_path"],
                        md5: null
                    }
                    await timeout(5000)
                    let getTaobaoDetail = async _ => await this.getTaobaoDetail(data).then(async res => {
                        res || (console.log("出错,即将重试", data.uniqueID), await timeout(2000), await getTaobaoDetail())
                        res && await this.insert(res)
                    })
                    try {
                        await getTaobaoDetail()
                    } catch (e) {
                        console.log(e);
                    }
                    await timeout(2000)
                }
            })
            resolve()
        })
    },
    getTaobaoDetail(data) {
        const path = "http://162.14.108.171:10006/taobao/page/detail?typeof=3&"
        const key = "bba230047f08154bbecb5a066b0228f3"
        const url = path + "key=" + key + "&itemid=" + data.uniqueID
        return new Promise(async resolve => {
            console.log("获取详情", data.uniqueID);
            await axios.get(url).then(res => {
                console.log("sku_price是否存在", JSON.stringify(res.data).includes("sku_price"));
                console.log("sku2info是否存在", JSON.stringify(res.data).includes("sku2info"));
                if (!res.data.data) {
                    console.log(res.data);
                    console.log(url);
                    return resolve(false)
                }
                let realData, cache
                try {
                    realData = JSON.parse(res.data.data["apiStack"][0]["value"]).global.data
                    cache = {
                        skuBase: realData.skuBase,
                        seller: realData.seller,
                        skuCore: realData.skuCore
                    }
                    data.shop = res.data.data["seller"]["shopName"]
                } catch (e) {
                    throw new Error(e)
                }
                let setResult
                try {
                    data.baseInformation = JSON.stringify(res["data"]["data"]["props"]["groupProps"][0])
                    setResult = this.setInformation(res["data"]["data"]["props"]["groupProps"][0]["基本信息"])
                    data.originCountry = setResult[0]
                    data.originProvince = setResult[1]
                    data.originAddress = setResult[2]
                    data.variety = setResult[3]
                } catch (e) {
                    console.log("无基本信息");
                }
                try {
                    data.specifications = this.parseSpecifications(cache, !!Object.keys(cache["skuCore"]).length, realData, res.data.data)
                } catch (e) {
                    console.log(e);
                    console.log(cache);
                }
                return resolve(data)
            })
        })
    },
    parseSpecifications(data, type, realData, twoData) {
        let props
        if (data.skuBase) {
            props = data.skuBase.props
        } else {
            console.log("sku", data);
            if (data["skuCore"]["sku2info"]["0"]) {
                console.log(realData);
                return JSON.stringify([{
                    "from": realData["skuBarVO"]["skuText"],
                    "label": realData["titleVO"]["title"],
                    "price": data["skuCore"]["sku2info"]["0"]["price"]["priceText"]
                }])
            } else {
                return ""
            }
        }
        let getPrice = id => {
            return data.skuCore.sku2info[id].price.priceText
        }
        let getLabel = id => {
            for (const item of data.skuBase.props[1].values) if (id === item.vid) return item.name
        }
        if (type) {
            let prop = props[0]
            let cache = []
            try {
                for (let value of prop.values) {
                    let cacheData = {
                        from: prop.name,
                        label: value.name,
                        prices: []
                    }
                    let cacheSkus = data.skuBase.skus
                    for (let item of cacheSkus) {
                        let path = item.propPath.split(";")
                        if (path[0].split(":")[1] === value["vid"]) {
                            cacheData.prices.push({
                                "from": props[1]["name"],
                                "label": getLabel(path[1].split(":")[1]),
                                "price": getPrice(item["skuId"])
                            })
                        }
                    }
                    cache.push(cacheData)
                }
            } catch (e) {
                console.log(realData);
                console.log(e);
                console.log("类型有误");
                return ""
            }
            return JSON.stringify(cache)
        } else {
            console.log("类型2");
            console.log(twoData);
            return ""
        }
    },
    insert({
               id,
               uniqueID,
               type,
               keyword,
               title,
               time,
               platform,
               url,
               shop,
               originCountry,
               originProvince,
               originAddress,
               variety,
               specifications,
               sales,
               face,
               baseInformation
           }) {
        if (!specifications.length) {
            return console.log("无价格表,跳过")
        }
        console.log(specifications);
        return new Promise(async (resolve) => {
            console.log("开始添加");
            await connection.query(
                `INSERT INTO tmall (id,
                                        uniqueID,
                                        type,
                                        keyword,
                                        title,
                                        time,
                                        platform,
                                        url,
                                        shop,
                                        originCountry,
                                        originProvince,
                                        originAddress,
                                        variety,
                                        specifications,
                                        sales,
                                        face,
                                        md5,
                   ext
                   )
                     VALUES ('${id}',
                             '${uniqueID}',
                             '${type}',
                             '${keyword}',
                             '${title}',
                             '${time}',
                             '${platform}',
                             '${url}',
                             '${shop}',
                             '${originCountry}',
                             '${originProvince}',
                             '${originAddress}',
                             '${variety}',
                             '${specifications}',
                             '${sales}',
                             '${face}',
                             '${md5(specifications)}',
                             '${baseInformation}'
                             );`.replaceAll("\n", ""),
                (err, result) => {
                    if (err) {
                        throw err;
                    }
                    resolve();
                }
            );
        })
    }
}

request.start(7, 100).then(console.log)
