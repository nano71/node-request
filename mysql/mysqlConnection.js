const mysql = require("mysql");
const {getType} = require("../utils/getType");


module.exports.connection = mysql.createPool({
    host: "121.37.198.222",
    port: "3306",
    user: "root",
    password: "14dfc14b652ae6cf",
    database: "http_request",
    connectionLimit: "20",
})
module.exports.exists = async (id, type) => {
    return new Promise(resolve => {
        this.connection.query(
            `select *
             from tmall
             where uniqueID like ${id}
               and type like ${global.period}`,
            [],
            async (err, result) => {
                console.log(result.length, "条已存在数据", id);
                if (err) throw new Error(err)
                return resolve(result.length > 0);
            })
    })
}
