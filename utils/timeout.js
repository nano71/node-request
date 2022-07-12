module.exports.timeout = async function (delay = parseInt((Math.random() * 5000).toFixed(0)), log) {
    return new Promise(resolve => {
        if (log === undefined) {
            console.log(delay, "毫秒延迟");
        }
        setTimeout(resolve, delay)
    })
}
