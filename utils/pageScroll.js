module.exports.pageScroll = function (page) {
    try {
        return page.evaluate(() => {
            return new Promise((resolve, reject) => {
                let totalHeight = 0;
                let timer = setInterval(() => {
                    window.scrollBy(0, Math.random() * 100);
                    totalHeight += Math.random() * 100;
                    if (totalHeight >= document.body.scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            })
        });
    } catch (e) {

    }

}
