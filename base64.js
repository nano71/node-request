module.exports.toBase64 = function (string) {
    const buff = Buffer.from(string, "utf-8");
    return buff.toString('base64')
}
module.exports.parseBase64 = function (base64) {
    const buff = Buffer.from(base64, "base64");
    return buff.toString()
}
