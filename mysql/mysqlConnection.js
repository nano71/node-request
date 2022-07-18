const mysql = require("mysql");
const { getType } = require("../utils/getType");


module.exports.connection = mysql.createPool({
    host: "119.29.102.216",
    port: "3306",
    user: "http_request",
    password: "ftNEADnLd3xcXbAd",
    database: "http_request",
    connectionLimit: "20",
})
module.exports.exists = async (specifications, type) => {
    return new Promise(resolve => {
        this.connection.query(
            `select *
             from pomelo
             where specifications = ?
               and type = ?`,
            [specifications, type],
            async (err, result) => {
                console.log(result.length, "条已存在数据");
                if (err) throw new Error(err)
                return resolve(result.length > 0);
            })
    })
}
module.exports.exists4tm = async (uniqueID, type) => {
    return new Promise(resolve => {
        this.connection.query(
            `select *
             from pomelo
             where uniqueID = ?
               and type = ?`,
            [uniqueID, type],
            async (err, result) => {
                console.log(result.length, "条已存在数据");
                if (err) throw new Error(err)
                return resolve(result.length > 0);
            })
    })
}
