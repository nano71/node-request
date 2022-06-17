const axios = require("axios");
const useProxy = require("puppeteer-page-proxy");
const {timeout} = require("./timeout");
module.exports.getProxy = async _ => {
    return new Promise(async resolve => {
        await axios.get("http://api.caihongdaili.com/proxy/unify/get?product_type=exclusive&token=GswVZcYTLKxFcXHd&proxy_type=http&amount=1&expire=300&repeat=1&format=json&auto_whitelist=true").then(res => {
            let data = res.data.data
            // console.log(res.data);
            resolve(data)
        })
    })
}
module.exports.setProxy = async (page, proxy) => {
    if (proxy.length === 0) {
        return console.log("不设置代理");
    }
    return new Promise(async resolve => {
        console.log("设置代理");
        for (let item of proxy) {
            console.log(item);
            // const url = item["ip"] + ":" + item["http_port"]
            const url = "nano71.com:8081"
            // await page.goto("http://ip-api.com/line/?lang=zh-CN", {timeout: 10000});
            await useProxy(page, "https://" + url)
            // await timeout(10000)
            try {
                console.time("proxy");
                console.log("检测代理中", url);
                try {
                    await page.goto("http://ip-api.com/line/?lang=zh-CN", {timeout: 10000});
                } catch (e) {
                    console.log(e);
                }
                console.log("代理连接成功", url);
                console.timeEnd("proxy");
                return resolve(url)
            } catch (e) {
                console.timeEnd("proxy")
                console.log("代理连接失败", url);
            }
        }
        return resolve()
    })
}

//Proxy Authentication Failed
