const express = require("express")
const {request, response} = require("express");
const app = express()
const port = 8082
app.listen(port, () => console.log(port, "监听中"))
app.get("/detail", (request, response) => {
    response.json(
        {
            type: "抖音达人",
            id: "100050218866",
            starMapID: "6674503975334576132",
            MCN: "101名师工厂",
            address: "温尼伯",
            name: "大白外教英语",
            tag: "教育培训",
            tag2: "语言教学",
            styleTag: null,
            taskType: "抖音传播任务, 直播品牌推广任务, 抖音素材授权任务",
            prices: "抖音1-20s视频:50000元, 抖音21-60s视频:70000元, 抖音60s以上视频:90000元, 抖音多视频推送广告平台:100元, 抖音品牌推广专场（按小时）:30000元, 抖音单视频推送广告平台:100元, 抖音下载:100元, 抖音品牌推广专场（按天）:100000元",
            fansCount: 3835079,
            transmissionIndex: 69.9651,
            starMapIndex: 74.8567,
            costPerformanceIndex: 70.2031,
            powderIndexL: 79.3829,
            cooperationIndex: 65.0018,
            expectedPlayCount: 39199,
            CPM: 1275.54,
            genderDistribution: "男: 46.46%, 女: 53.53%",
            deviceDistribution: "华为: 1.93%, vivo: 1.32%, iPhone: 32.78%, 其他: 61.89%, 小米: 0.53%, OPPO: 1.52%",
            ageDistribution: "<18: 17.8%, 18-25: 26.99%, 26-32: 21.07%, 33-39: 19.47%, 40-46: 8.67%, >46: 5.97%",
            regionalDistribution: "青海: 0.3%, 河南: 5.42%, 山东: 6.08%, 四川: 5.24%, 江苏: 7.74%, 贵州: 2.11%, 新疆: 1.6%, 福建: 3.03%, 浙江: 5.7%, 湖北: 3.74%",
            url: "https://www.xingtu.cn/mobile/ad/author/6674503975334576132/1/1",
            recommendationIndex: 84.2254,
            activityDistribution: "中度: 2.79%, 重度: 71.01%, 轻度: 26.18%"
        }
    )
})
