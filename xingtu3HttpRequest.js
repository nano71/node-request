const axios = require("axios");
const mysql = require("mysql");
const {toBase64} = require("./base64");

let url = "https://www.xingtu.cn/v/api/user/author_page/?author_id="
let option = "&platform_source=1&platform_channel=1&request_source_type=1&recommend=false"
let authorID = "6629662438889357326"
let list = []

function getInformation(id) {
    return new Promise(resolve => {
        let url = "https://www.xingtu.cn/h/api/gateway/handler_get/?o_author_id=" + id + "&platform_source=1&platform_channel=1&service_name=author.AdStarAuthorService&service_method=GetAuthorPlatformChannelInfoV2"
        axios.get(url, {
            headers: {
                cookie: "csrftoken=fWcaSwpBdAPQXFpQlsgygacLVymyjXSN; tt_webid=7108560867126068772; passport_csrf_token=c9112da6eb2994498a8f297eee2dce0b; passport_csrf_token_default=c9112da6eb2994498a8f297eee2dce0b; sid_guard=1906fc08f4af10cbf3ad6a2843407a19|1655090921|5183999|Fri,+12-Aug-2022+03:28:40+GMT; uid_tt=05184a9816e885511d4049d7a5a17918; uid_tt_ss=05184a9816e885511d4049d7a5a17918; sid_tt=1906fc08f4af10cbf3ad6a2843407a19; sessionid=1906fc08f4af10cbf3ad6a2843407a19; sessionid_ss=1906fc08f4af10cbf3ad6a2843407a19; sid_ucp_v1=1.0.0-KDY0N2E5YzNiNzcwYzM0MzJkNTU3ZDhiZDg4MDgzYTkxOTQ0ODU3YjcKFwi4yIDh_IyBBhDp3ZqVBhimDDgBQOsHGgJsZiIgMTkwNmZjMDhmNGFmMTBjYmYzYWQ2YTI4NDM0MDdhMTk; ssid_ucp_v1=1.0.0-KDY0N2E5YzNiNzcwYzM0MzJkNTU3ZDhiZDg4MDgzYTkxOTQ0ODU3YjcKFwi4yIDh_IyBBhDp3ZqVBhimDDgBQOsHGgJsZiIgMTkwNmZjMDhmNGFmMTBjYmYzYWQ2YTI4NDM0MDdhMTk; gftoken=MTkwNmZjMDhmNHwxNjU1MDkwOTIxMDh8fDAGBgYGBgY; star_sessionid=4b986e3640543a057f989af97a97c598"
            }
        }).then(r => {
            resolve(r.data)
        })
    })
}


function request() {
    return new Promise(async resolve => {
        for (let i = 0; i < list.length; i++) {
            console.time('timer')
            let id = list[i].starMapID
            await axios.get(url + id + option, {
                headers: {
                    cookie: "csrftoken=fWcaSwpBdAPQXFpQlsgygacLVymyjXSN; tt_webid=7108560867126068772; passport_csrf_token=c9112da6eb2994498a8f297eee2dce0b; passport_csrf_token_default=c9112da6eb2994498a8f297eee2dce0b; sid_guard=1906fc08f4af10cbf3ad6a2843407a19%7C1655090921%7C5183999%7CFri%2C+12-Aug-2022+03%3A28%3A40+GMT; uid_tt=05184a9816e885511d4049d7a5a17918; uid_tt_ss=05184a9816e885511d4049d7a5a17918; sid_tt=1906fc08f4af10cbf3ad6a2843407a19; sessionid=1906fc08f4af10cbf3ad6a2843407a19; sessionid_ss=1906fc08f4af10cbf3ad6a2843407a19; sid_ucp_v1=1.0.0-KDY0N2E5YzNiNzcwYzM0MzJkNTU3ZDhiZDg4MDgzYTkxOTQ0ODU3YjcKFwi4yIDh_IyBBhDp3ZqVBhimDDgBQOsHGgJsZiIgMTkwNmZjMDhmNGFmMTBjYmYzYWQ2YTI4NDM0MDdhMTk; ssid_ucp_v1=1.0.0-KDY0N2E5YzNiNzcwYzM0MzJkNTU3ZDhiZDg4MDgzYTkxOTQ0ODU3YjcKFwi4yIDh_IyBBhDp3ZqVBhimDDgBQOsHGgJsZiIgMTkwNmZjMDhmNGFmMTBjYmYzYWQ2YTI4NDM0MDdhMTk; gftoken=MTkwNmZjMDhmNHwxNjU1MDkwOTIxMDh8fDAGBgYGBgY; star_sessionid=4b986e3640543a057f989af97a97c598"
                }
            }).then(async r => {
                let result = r.data.data
                if (r.data.code === 0) {
                    let data = {
                        starMapID: id,
                        realID: result["unique_id"],
                        avatar: result["avatar_uri"],
                    }
                    await save(data)
                } else {
                    console.log(r.data);
                }
            });
            console.timeEnd("timer")
        }
        resolve()
    })
}

let connection = mysql.createPool({
    host: "localhost",
    port: "3306",
    user: "root",
    password: "123456",
    database: "http_request",
    connectionLimit: "20",
})
connection.query("select * from starmap where realID is null", [], async (err, result) => {
    if (err) throw err
    list = JSON.parse(JSON.stringify(result))
    request().then(r => console.log("结束"))
})

function save(data) {
    console.log("save", data);
    connection.query(`UPDATE http_request.starmap t
                          SET t.realID            = '${data.realID}', 
                              t.avatar            = '${data.avatar}'
                          WHERE t.starMapID = ${data.starMapID} ;`.replaceAll(/\n/g, ""), [],
        async (err, result) => {
            if (err) throw err
            result.fieldCount === 0 && console.log("更新完成");
        })
}

