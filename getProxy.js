const axios = require("axios");
module.exports.getProxy = _ => {
    return new Promise(async resolve => {
        await axios.get("http://api.caihongdaili.com/proxy/shared/get?token=GswVZcYTLKxFcXHd&proxy_type=http&amount=10&expire=5-30&repeat=1&format=json&auto_whitelist=true").then(res => {
            let data = res.data.data
            // console.log(res.data);
            resolve(data)
        })
    })
}
//Proxy Authentication Failed
