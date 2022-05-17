module.exports.toBase64 = function (string) {
    const buff = Buffer.from(string, 'utf-8');
    return buff.toString('base64')
}
