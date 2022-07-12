const axios = require("axios"), rankTypes = ["rank_inc", "rank_dec", "rank_digg"]
const {connection} = require("../mysql/mysqlConnection");
const removeEmoji = /[\uD83C|\uD83D\uD83E][\uDC00-\uDFFF][\u200D|\uFE0F]|[\uD83C|\uD83D\uD83E][\uDC00-\uDFFF]|[\d|*#]\uFE0F\u20E3|[\d|#]\u20E3|[\u203C-\u3299]\uFE0F\u200D|[\u203C-\u3299]\uFE0F|[\u2122-\u2B55]|\u303D|[A9|E]\u3030|uA9|uAE|\u3030/ig


let request = {
    Cookie: "_ga=GA1.1.1144312456.1655102766; __root_domain_v=.huitun.com; _qddaz=QD.649255102766639; Hm_lvt_51956877b2ac5aabc38d224aa78a05d8=1653549253,1655102872; zy_token=6dcae611-3487-493e-9d02-2ef9f2457d82; SESSION=OWNhYzRkNmUtYzlhNy00OTRiLWExOWQtYzQxODRjMTQ0Njgy; _ga_JBKBWWH0KV=GS1.1.1655109857.2.1.1655110117.0",
    request(path) {
        return new Promise(resolve => {
            axios.get("https://dyapi.huitun.com" + path, {
                headers: {
                    Cookie: this.Cookie
                },
            }).then(resolve).catch(resolve)
        })
    },
    parseResult(result) {
        if (result.length === 3) {
            if (result[0]) {
                console.log(result[2]);
                throw new Error(result[0])
            }
            result[1].fieldCount === 0 && console.log("插入成功")
            return
        }
        if (result.status === 200) {
            if (result.data.data.length === 0) {
                console.log("空结果");
            }
            return result.data.data
        } else {
            throw new Error(result.toString())
        }
    },
    _getLiveRank([path, data]) {
        return this.request(`${path}?cate=&from=${data.from}&sort=gmv`)
    },
    _getStarRank([path, data]) {
        path = `${path}?from=${data.from}&rankType=${data.rankType}&periodType=day&rdate=06%E6%9C%8811%E6%97%A5&cid=&follower=&verify=`
        console.log(path);
        return this.request(path)
    },
    _getGoodsRank([path, data]) {
        return this.request(`${path}?rdate=06%E6%9C%8811%E6%97%A5&periodType=day&cid0=&cid1=&cid2=&cid3=&cid4=&choice=&source=&price=&sort=&from=${data.from}`)
    },
    _getShopRank([path, data]) {
        return this.request(`${path}?from=${data.from}&rdate=06%E6%9C%8811%E6%97%A5&cate=&sort=&tag=&periodType=day`)
    },

    getRecord([path, data]) {
        return this.request(`${path}?uid=${data.uid}&time=&from=${data.from}&mod=DESC&start=2022-03-16&end=2022-06-13`)
    },
    getGoods([path, data, type]) {
        if (type) return this.request(`${path}?uid=${data.uid}&from=${data.from}&time=&subId=&keyword=&queryTime=&brand=`)
        return this.request(`${path}?uid=${data.uid}&from=${data.from}&time=`)
    },
    getDetail(path, uid) {
        return this.request(`${path}?uid=${uid}`)
    },
    getFans(path, uid) {
        return this.request(`${path}?uid=${uid}`)
    },
    getWorksList([path, data]) {
        return this.request(`${path}?uid=${data.uid}&from=${data.from}&sortField=newest&queryTimeStart=2022-03-16&queryTimeEnd=2022-06-13&maskRemoved=false`)
    },
    async getStarRank() {
        for (let i = 1; i <= 10; i++) {
            for (let rankType of rankTypes) {
                console.log(rankType);
                await this.get("/rank/userScoreRank", {from: i, rankType}).then(res => {
                    if (res.status === 200) {
                        let list = res.data.data
                        for (const item of list) {
                            this.insertStarRank(item, rankType)
                        }
                    } else {
                        throw new Error(res.toString())
                    }
                })
            }
        }
    },
    async getLiveRank() {
        for (let i = 1; i <= 10; i++) {
            await this.get("/rank/live/currentTakeGoodsUser", {from: i}).then(res => {
                let list = this.parseResult(res).list
                console.log(list);
                for (const item of list) {
                    console.log(list);
                }
            })
        }
    },
    async getGoodsRank() {
        for (let i = 1; i <= 10; i++) {
            await this.get("/rank/v2/dyGoods", {from: i}).then(res => {
                let list = this.parseResult(res)
                for (let item of list) {
                    this.insertGoodsRank(item)
                }
            })
        }
    },
    async getShopRank() {
        for (let i = 1; i <= 10; i++) {
            await this.get("/rank/v2/shop", {from: i}).then(res => {
                let list = this.parseResult(res)
                // console.log(list.length);
                for (let item of list) {
                    this.insertShopRank(item)
                }
            })
        }
    },

    getLiveRankAllDetail() {
        connection.query("select * from liverank", [], async (err, result) => {
            if (err) throw err
            let index = 1
            for (const value of result) {
                await connection.query("select * from livedetail where uid = ?", [value.uid], async (err, result) => {
                    if (!result.length) {
                        await this.get("/user/detail", {uid: value.uid}).then(async res => {
                            if (res.status === 200) {
                                // console.log(res.data.data.awemeMapList)
                                let cache = res.data.data
                                let fans, videoGoods, liveList, liveGoods, videoList

                                await this.get("/live/goods", {uid: cache.uid, from: 1}).then(res => {
                                    if (res.status === 200) {
                                        liveGoods = JSON.stringify(res.data.data).replaceAll("'", "").replaceAll(removeEmoji, "")
                                    } else {
                                        throw new Error(res.toString())
                                    }
                                })
                                await this.get("/user/awemeList", {uid: cache.uid, from: 1}).then(res => {
                                    if (res.status === 200) {
                                        videoList = JSON.stringify(res.data.data).replaceAll(removeEmoji, "").replaceAll("'", "")
                                    } else {
                                        throw new Error(res.toString())
                                    }
                                })
                                await this.get("/live/v2/record", {uid: cache.uid, from: 1}).then(res => {
                                    if (res.status === 200) {
                                        liveList = JSON.stringify(res.data.data).replaceAll(removeEmoji, "").replaceAll("'", "")
                                    } else {
                                        throw new Error(res.toString())
                                    }
                                })
                                await this.get("/user/fans", {uid: cache.uid}).then(res => {
                                    if (res.status === 200) {
                                        fans = JSON.stringify(res.data.data).replaceAll(removeEmoji, "")
                                    } else {
                                        console.log(res);
                                        throw new Error(res.toString())
                                    }
                                })
                                await this.get("/user/awemeGoods", {uid: cache.uid, from: 1}).then(res => {
                                    if (res.status === 200) {
                                        videoGoods = JSON.stringify(res.data.data).replaceAll("'", "").replaceAll(removeEmoji, "")
                                    } else {
                                        throw new Error(res.toString())
                                    }
                                })
                                console.log(res.data);
                                let data = {
                                    uid: cache.uid,
                                    nickName: cache.nickname.replaceAll(removeEmoji, ""),
                                    avatarUrl: cache.avatarUrl,
                                    followerCount: cache.followerCount,
                                    fans,
                                    realId: cache.authorId,
                                    category: cache.category,
                                    signature: cache.signature.replaceAll(removeEmoji, "").replaceAll("\n", "").replaceAll("'", ""),
                                    newAddFollowerCount: cache.followingCount,
                                    liveList,
                                    liveGoods,
                                    videoList,
                                    videoGoods
                                }
                                // console.log(data);
                                this.insertDetail(data)
                            } else {
                                throw new Error(res.toString())
                            }
                        })
                        console.log("插入成功")
                        console.log(index);
                        index++
                    } else {
                        console.log("存在,跳过")
                        console.log(index);
                        index++
                    }
                })

            }
        })
    },
    getStarRankAllDetail() {
        connection.query("select * from starrank", [], async (err, result) => {
            if (err) throw err
            let index = 1
            for (const value of result) {
                await connection.query("select * from stardetail where uid = ?", [value.uid], async (err, result) => {
                    if (!result.length) {
                        await this.get("/user/detail", {uid: value.uid}).then(async res => {
                            let cache = this.parseResult(res),
                                fans, videoGoods, liveList, liveGoods,
                                videoList
                            console.log("liveGoods");
                            await this.get("/live/goods", {uid: cache.uid, from: 1}).then(res => {
                                liveGoods = JSON.stringify(this.parseResult(res)).replaceAll("'", "").replaceAll(removeEmoji, "")
                            })
                            console.log("videoList");
                            await this.get("/user/awemeList", {uid: cache.uid, from: 1}).then(res => {
                                videoList = JSON.stringify(this.parseResult(res)).replaceAll(removeEmoji, "").replaceAll("'", "")
                            })
                            console.log("liveList");
                            await this.get("/live/v2/record", {uid: cache.uid, from: 1}).then(res => {
                                liveList = JSON.stringify(this.parseResult(res)).replaceAll(removeEmoji, "").replaceAll("'", "")
                            })
                            console.log("fans");
                            await this.get("/user/fans", {uid: cache.uid}).then(res => {
                                fans = JSON.stringify(this.parseResult(res)).replaceAll(removeEmoji, "")
                            })
                            console.log("videoGoods");
                            await this.get("/user/awemeGoods", {uid: cache.uid, from: 1}).then(res => {
                                videoGoods = JSON.stringify(this.parseResult(res)).replaceAll("'", "").replaceAll(removeEmoji, "")
                            })
                            let data = {
                                uid: cache.uid,
                                nickName: cache.nickname.replaceAll(removeEmoji, ""),
                                avatarUrl: cache.avatarUrl,
                                followerCount: cache.followerCount,
                                fans,
                                realId: cache.authorId,
                                category: cache.category,
                                signature: cache.signature.replaceAll(removeEmoji, "").replaceAll("\n", "").replaceAll("'", ""),
                                newAddFollowerCount: cache.followingCount,
                                liveList,
                                liveGoods,
                                videoList,
                                videoGoods
                            }
                            console.log(data);
                            await this.insertDetail(data)
                        })
                        console.log("插入成功")
                        console.log(index);
                        index++
                    } else {
                        console.log("存在,跳过")
                        console.log(index);
                        index++
                    }
                })

            }
        })

    },

    insertDetail(data) {
        console.log("insertDetail");
        connection.query(`INSERT INTO livedetail
                          (uid, fans, realId, nickName, followerCount, avatarUrl,
                           category,
                           signature, newAddFollowerCount, videoList, liveList,
                           liveGoods,
                           videoGoods)
                          VALUES ('${data["uid"]}',
                                  '${data["fans"]}',
                                  '${data["realId"]}',
                                  '${data["nickName"]}',
                                  '${data["followerCount"]}',
                                  '${data["avatarUrl"]}',
                                  '${data["category"]}',
                                  '${data["signature"]}',
                                  '${data["newAddFollowerCount"]}',
                                  '${data["videoList"]}',
                                  '${data["liveList"]}',
                                  '${data["liveGoods"]}',
                                  '${data["videoGoods"]}
                              ');`, (err, result) => {
            this.parseResult([err, result, data])
        });
    },
    insertLiveRank(data) {
        connection.query(`INSERT INTO liverank (coverImage, nickName, followerCount, liveRank, roomId, uid)
                          VALUES ('${data["avatarUrl"]}',
                                  '${data["nickName"].replaceAll(removeEmoji, "")}',
                                  '${data["followerCount"]}',
                                  '${data["rank"]}',
                                  ${data["roomId"]},
                                  ${data["uid"]});`, (err, result) => {
            this.parseResult([err, result, data])
        });
    },
    insertStarRank(data, rankType) {
        // console.log(data);
        connection.query(`INSERT INTO starrank (avatarUrl, nickName, followerCount, starRank, uid, rankType)
                          VALUES ('${data["avatarUrl"]}',
                                  '${data["nickname"].replaceAll(removeEmoji, "")}',
                                  '${data["followerCount"]}',
                                  '${data["rank"]}',
                                  '${data["uid"]}',
                                  '${rankType}');`, (err, result) => {
            this.parseResult([err, result, data])
        });
    },
    insertGoodsRank(data) {
        connection.query(`insert into goodsrank
                          (coverImage, title, videoCount, liveCount, starCount, goodsRank, sales, tag, pid)
                              value (
                                      '${data["coverUrl"]}',
                                      '${data["title"]}',
                                      '${data["videoNum"]}',
                                      '${data["liveNum"]}',
                                      '${data["uidNum"]}',
                                      '${data["rank"]}',
                                      '${data["sales"]}',
                                      '${data["cat"]}',
                                      '${data["pid"]}'
                )`, (err, result) => {
            this.parseResult([err, result, data])
        })
    },
    insertShopRank(data) {
        console.log(data["category"]);
        connection.query(`insert into shoprank
                          (coverImage, shopname, videoCount, liveCount, starCount, goodsCount, shopRank, sales,
                           category, sid)
                              value (
                                      '${data["cover"]}',
                                      '${data["desc"]}',
                                      '${data["videoCount"]}',
                                      '${data["liveCount"]}',
                                      '${data["uidCount"]}',
                                      '${data["pidCount"]}',
                                      '${data["rank"]}',
                                      '${data["sales"]}',
                                      '${data["category"]?.join()}',
                                      '${data["shopId"]}'
                )`, (err, result) => {
            this.parseResult([err, result, data])
        })
    },

    get(path, data) {
        const nano = [path, data]
        switch (path) {
            case "/live/goods":
                return this.getGoods([path, data, 0])
            case "/user/awemeGoods":
                return this.getGoods([path, data, 1])
            case "/live/v2/record":
                return this.getRecord(nano)
            case "/user/detail":
                return this.getDetail(path, data.uid)
            case "/user/fans":
                return this.getFans(path, data.uid)
            case "/user/awemeList":
                return this.getWorksList(nano)
            case "/rank/v2/dyGoods":
                return this._getGoodsRank(nano)
            case "/rank/v2/shop":
                return this._getShopRank(nano)
            case "/rank/live/currentTakeGoodsUser":
                return this._getLiveRank(nano)
            case "/rank/userScoreRank":
                return this._getStarRank(nano)
        }
    },
}

// request.getGoodsRank()
// request.getShopRank()

// request.get("/live/v2/record", {uid: 83853087940, from: 1}).then(console.log)
request.getStarRankAllDetail()
