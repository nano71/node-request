const { connection } = require("../mysql/mysqlConnection")
const md5 = require("md5");
const sql = require("../utils/sql");
const { timeout } = require("../utils/timeout");
const timestampToTime = require("../utils/time")
let nano71 = {
    list: [],
    init() {
        return new Promise(async (resolve) => {
            await this.getList().then(r => this.list = r)
            await this.loopData()
            resolve("结束")
        })
    },
    async loopData() {
        await this.truncate()
        //await timeout(50000,"5秒")
        console.log("loopData");
        let cache = []
        let md5List = []
        for (let item of this.list) {
            item.time = timestampToTime(new Date(item.time).getTime())
            item.specifications = this.parseSpecifications(item.specifications)
            item.md5 = md5(item.type + item.specifications)
            console.log("id", item.id);
            console.log("type", item.type);
            console.log("md5", item.md5);
            if (md5List.indexOf(item.md5) === -1) {
                cache.push(item)
                md5List.push(item.md5)
            } else {
                console.log("已存在");
            }
        }
        console.log("this.list.length: ", this.list.length);
        console.log("cache.length: ", cache.length);
        
        for (const item of cache) {
            await this.insert(item)
        }
    },
    parseSpecifications(data) {
        return JSON.stringify(JSON.parse(data).sort())
    },
    getList() {
        console.log("getList");
        return new Promise(resolve => {
            let sql = "select * from tmall"
            connection.query(sql, [], (error, result) => {
                if (error) throw new Error(error)
                resolve(result)
            })
        })
    },
    insert(object) {
        console.log("插入")
        return new Promise(resolve => {
            connection.query(sql(object, "pomelo"), [], (error, result) => {
                if (error) throw new Error(error)
                resolve()
            })
        })
    },
    truncate() {
        return new Promise(resolve => {
            connection.query("truncate pomelo", [], (error, result) => {
                if (error) throw new Error(error)
                resolve()
            })
        })
    }
}
nano71.init().then(console.log)