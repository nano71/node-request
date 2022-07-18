let sql = (object, table) => "INSERT INTO " + table + " (" + Object.keys(object).toString().replaceAll("'", "")
    + ") VALUES ('" + Object.values(object).join("','") + "');";
module.exports = sql
