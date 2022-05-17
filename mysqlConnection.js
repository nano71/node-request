const mysql = require("mysql");
module.exports.connection = mysql.createPool({
    host: "localhost",
    port: "3306",
    user: "root",
    password: "123456",
    database: "http_request",
    connectionLimit: "20",
})
