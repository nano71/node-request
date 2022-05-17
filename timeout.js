module.exports.timeout = async function (type, log) {
    return new Promise(resolve => {
        let randomTime = parseInt((Math.random() * 5000).toFixed(0));
        if (type) {
            randomTime = type
        }
        if (log === undefined) {
            console.log(randomTime, "毫秒延迟");
        }
        setTimeout(resolve, randomTime)
    })
}
