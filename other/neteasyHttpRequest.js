let https = require("https");

let fs = require("fs");

let cheerio = require("cheerio");
let iconv = require('iconv-lite');
let BufferHelper = require('bufferhelper');
const urls = [
    'https://gift.163.com/product_dtl/1393.html',
    'https://gift.163.com/product_dtl/6546.html',
    'https://gift.163.com/product_dtl/6121.html',
    'https://gift.163.com/product_dtl/1704.html',
    'https://gift.163.com/product_dtl/1703.html',
    'https://gift.163.com/product_dtl/2604.html',
    'https://gift.163.com/product_dtl/2179.html',
    'https://gift.163.com/product_dtl/2609.html',
    'https://gift.163.com/product_dtl/2056.html',
    'https://gift.163.com/product_dtl/2103.html',
    'https://gift.163.com/product_dtl/2205.html',
    'https://gift.163.com/product_dtl/1867.html',
    'https://gift.163.com/product_dtl/2067.html',
    'https://gift.163.com/product_dtl/1591.html',
    'https://gift.163.com/product_dtl/2062.html',
    'https://gift.163.com/product_dtl/1765.html',
    'https://gift.163.com/product_dtl/2066.html',
    'https://gift.163.com/product_dtl/1386.html',
    'https://gift.163.com/product_dtl/2072.html',
    'https://gift.163.com/product_dtl/1023.html',
    'https://gift.163.com/product_dtl/1136.html',
    'https://gift.163.com/product_dtl/1709.html',
    'https://gift.163.com/product_dtl/1755.html',
    'https://gift.163.com/product_dtl/2610.html',
    'https://gift.163.com/product_dtl/2057.html',
    'https://gift.163.com/product_dtl/1715.html',
    'https://gift.163.com/product_dtl/2462.html',
    'https://gift.163.com/product_dtl/1397.html',
    'https://gift.163.com/product_dtl/1868.html',
    'https://gift.163.com/product_dtl/1708.html',
    'https://gift.163.com/product_dtl/2063.html',
    'https://gift.163.com/product_dtl/2073.html',
    'https://gift.163.com/product_dtl/1469.html',
    'https://gift.163.com/product_dtl/2068.html',
    'https://gift.163.com/product_dtl/1387.html',
    'https://gift.163.com/product_dtl/1836.html',
    'https://gift.163.com/product_dtl/2201.html',
    'https://gift.163.com/product_dtl/3888.html',
    'https://gift.163.com/product_dtl/1710.html',
    'https://gift.163.com/product_dtl/1116.html',
    'https://gift.163.com/product_dtl/2611.html',
    'https://gift.163.com/product_dtl/2058.html',
    'https://gift.163.com/product_dtl/1592.html',
    'https://gift.163.com/product_dtl/1713.html',
    'https://gift.163.com/product_dtl/1869.html',
    'https://gift.163.com/product_dtl/1705.html',
    'https://gift.163.com/product_dtl/3006.html',
    'https://gift.163.com/product_dtl/1388.html',
    'https://gift.163.com/product_dtl/2074.html',
    'https://gift.163.com/product_dtl/2202.html',
    'https://gift.163.com/product_dtl/1777.html',
    'https://gift.163.com/product_dtl/1801.html',
    'https://gift.163.com/product_dtl/2612.html',
    'https://gift.163.com/product_dtl/2059.html',
    'https://gift.163.com/product_dtl/1837.html',
    'https://gift.163.com/product_dtl/1593.html',
    'https://gift.163.com/product_dtl/6647.html',
    'https://gift.163.com/product_dtl/1829.html',
    'https://gift.163.com/product_dtl/1802.html',
    'https://gift.163.com/product_dtl/1471.html',
]
let index = 0
for (const url of urls) {
    let bufferHelper = new BufferHelper();
    try {
        https.get(url, function callback(res) {
            res.on("data", function listener(chunk) {
                bufferHelper.concat(chunk);
            })
            res.on("end", function listener() {
                let html = iconv.decode(bufferHelper.toBuffer(), 'GBK')
                let $ = cheerio.load(html);
                let title = $("body > div.detail-header.l_Layout.l_Clearfix > div.detail-summary > h2").text()
                let elements = $("#p_desc > img");
                let price = $("#price_tb .c_Highlight").text().substring(1);
                elements.each(function fn(i, element) {
                    saveImage($(this).attr("src"), i, title).then(r => {
                        window.console.log('保存成功', title + i);
                    });
                });
                saveInfo(title, price);
                index++;
                window.console.log("进度", ((index / urls.length) * 100).toFixed(1), "%")
            });
        });
    } catch (e) {
        window.console.log(e);
    }
}

async function saveImage(imageUrl, fileName, folderName) {
    try {
        await https.get(imageUrl, function callBack(res) {
            res.setEncoding('binary');      //二进制(binary)
            let imageData = '';
            folderName = "./" + folderName;
            res.on('data', function (data) {  //图片加载到内存变量
                imageData += data;
            }).on('end', function () {
                if (!fs.existsSync(folderName)) {//加载完毕保存图片
                    fs.mkdirSync(folderName);
                }
                if (!fs.existsSync(folderName + '/' + fileName + '.png')) {
                    fs.writeFile(folderName + '/' + fileName + '.png', imageData, 'binary', function (err) {  //以二进制格式保存
                        // if (err) throw err;
                    });
                }

            });
        });
    } catch (e) {
        console.log(e);
    }
}

function saveInfo(folderName, price) {
    fs.writeFile("info.text", folderName + "\n" + price, 'utf8', (err) => {
        // if (err) throw err;
    });
}

function getHref() {
    let as = document.querySelectorAll("#product_content > li > a"), str = "";
    as.forEach(element => {
        window.console.log(element);
        str += "'https://gift.163.com" + element.attributes.href.value + "',\n";
    });
    window.console.log(str);
}

//
// setInterval(() => {
//     document.querySelector("#LAY-system-side-menu > li.layui-nav-item.layui-nav-itemed > dl > dd:nth-child(1) > a").click()
//     setTimeout(() => {
//         document.querySelector("#LAY_app_body > div.layadmin-tabsbody-item.layui-show > div.layui-fluid > div > div > div > div.layui-card-body > form > div:nth-child(4) > div.layui-input-inline > input").value = "-50"
//     },1000)
//
//     document.querySelector("#spider_urls").click()
//     setTimeout(() => {
//         document.querySelector("#LAY_app_body > div.layadmin-tabsbody-item.layui-show > div.layui-fluid > div > div > div > div.layui-card-body > form > div:nth-child(7) > div > button").click()
//     },5000)
// }, 10000)
