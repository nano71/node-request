const mysql = require("mysql");
const {getType} = require("./getType");
module.exports.connection = mysql.createPool({
    host: "192.168.101.161",
    port: "3306",
    user: "root",
    password: "123456",
    database: "http_request",
    connectionLimit: "20",
})
module.exports.exists = async (id, type) => {
    return new Promise(resolve => {
        this.connection.query(
            `select *
             from tmall
             where uniqueID like ${id}
               and type like ${getType(type)}`,
            [],
            async (err, result) => {
                console.log(result.length, "条已存在数据", id);
                if (err) throw new Error(err)
                return resolve(result.length > 0);
            })
    })
}
