const fs = require('fs');
const xlsx = require('node-xlsx')
const mysql = require("mysql");
let connection = mysql.createPool({
    host: "localhost",
    port: "3306",
    user: "root",
    password: "123456",
    database: "http_request",
    connectionLimit: "20" //设置连接池的数量
})
let path = "../../downloads/starMap/"

async function parseXlsx() {
    await fs.readdir(path, async (err, files) => {
        for (const file of files) {
            let parsePath = path + file
            let sheetList = xlsx.parse(parsePath);
            for (const sheet of sheetList) {
                for (let i = 1; i < sheet.data.length; i++) {
                    let row = sheet.data[i]
                    let data = {
                        test: "",
                        name: "",
                        starMapID: "",
                        ID: "",
                        MCN: "",
                        address: "",
                        fansCount: "",
                        tag: "",
                        tag2: "",
                        styleTag: "",
                        taskType: "",
                        prices: "",
                        starMapIndex: "",
                        transmissionIndex: "",
                        recommendationIndex: "",
                        costPerformanceIndex: "",
                        powderIndex: "",
                        cooperationIndex: "",
                        expectedPlayCount: "",
                        CPM: "",
                        genderDistribution: "",
                        ageDistribution: "",
                        activityDistribution: "",
                        deviceDistribution: "",
                        regionalDistribution: "",
                        url: "",
                    }
                    let number = 0
                    console.log(row[25]);
                    for (let dataKey in data) {
                        console.log(row[number]);
                        data[dataKey] = row[number] || "null"
                        number++
                    }
                    await insert(data)
                }
            }
        }
    })
}

async function parseXlsx2() {
    let sheetList = xlsx.parse("./121.xlsx");
    let excelData = [{data: []}]
    console.log(sheetList.length);
    for (const sheet of sheetList) {

        for (let i = 0; i < sheet.data.length; i++) {
            let row = sheet.data[i]
            row.length && excelData[0].data.push(row)
        }
    }
    let buffer = xlsx.build(excelData);
    //写入数据
    fs.writeFile("./122.xlsx", buffer, function (err) {
        if (err) {
            throw err;
        }
    })
}

let length = 0

async function exists(ID) {
    console.log("ID", ID);
    return new Promise(resolve => {
        connection.query(
            "select * from starmap where ID = ?",
            [ID],
            async (err, result) => {
                length = result.length
                resolve();
            })
    })
}

async function insert(data) {
    // console.log("'" + row.join("' , '") + "'");
    await exists(data.ID)
    if (!length) {
        return new Promise(async (resolve, reject) => {
            console.log("开始添加");
            await connection.query(`INSERT INTO starmap (test,
                                                         name,
                                                         starMapID,
                                                         ID,
                                                         MCN,
                                                         address,
                                                         fansCount,
                                                         tag,
                                                         tag2,
                                                         styleTag,
                                                         taskType,
                                                         prices,
                                                         starMapIndex,
                                                         transmissionIndex,
                                                         recommendationIndex,
                                                         costPerformanceIndex,
                                                         powderIndex,
                                                         cooperationIndex,
                                                         expectedPlayCount,
                                                         CPM,
                                                         genderDistribution,
                                                         ageDistribution,
                                                         regionalDistribution,
                                                         activityDistribution,
                                                         deviceDistribution,
                                                         url)
                                    VALUES ("${data.test}",
                                            "${data.name}",
                                            "${data.starMapID}",
                                            "${data.ID}",
                                            "${data.MCN}",
                                            "${data.address.replace(' - ', '') || 'null'}",
                                            "${data.fansCount}",
                                            "${data.tag}",
                                            "${data.tag2}",
                                            "${data.styleTag}",
                                            "${data.taskType}",
                                            "${data.prices}",
                                            "${data.starMapIndex}",
                                            "${data.transmissionIndex}",
                                            "${data.recommendationIndex}",
                                            "${data.costPerformanceIndex}",
                                            "${data.powderIndex}",
                                            "${data.cooperationIndex}",
                                            "${data.expectedPlayCount}",
                                            "${data.CPM}",
                                            "${data.genderDistribution}",
                                            "${data.ageDistribution}",
                                            "${data.regionalDistribution}",
                                            "${data.activityDistribution}",
                                            "${data.deviceDistribution}",
                                            "${data.url}");`
                , (err, result) => {
                    console.log(result);
                    resolve();
                });
        });
    } else {
        console.log("已存在");
    }
}

parseXlsx().then(r => console.log("完成"))
