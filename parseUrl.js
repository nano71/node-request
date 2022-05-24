module.exports.parseUrl = function (url) {
    return url.replace("https:", "").replace("http:", "").replace("//", "https://")
}

