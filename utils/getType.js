module.exports.getType = (type = "1") => {
    let date = new Date()
    let m = date.getMonth() + 1
    if (m < 10) {
        m = "0" + m
    }
    return date.getFullYear() + "" + m + "0" + type
}
