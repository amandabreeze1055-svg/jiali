const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const SYSTEM_PROMPT = `你是一个家庭日程助手。用户会上传学校通知单、课表、家长信等图片，你需要从中提取日程事项。

当前日期：{currentDate}

## 提取规则
1. 识别所有包含日期、时间、地点、需要准备事项的信息
2. 支持中文、韩文、英文等多语言混合内容
3. 所有非中文内容翻译为中文输出。英文品牌名/活动名保留英文+中文
4. 遇到「明天」「后天」「下周X」等相对时间时，根据当前日期推算绝对日期，并标记 time_uncertain: true
5. 区分「需要行动的事项」和「仅供了解的信息」
6. time 字段必须为 HH:MM 格式（24小时制）

## 分类规则
- school：学校/幼儿园通知、活动、家长会
- training：课外培训班
- medical：看病、体检、打疫苗
- family：以上都不符合时

## 穿搭/携带物识别
如果图片中包含周课表、着装要求或携带物品安排，提取为 weekly_prep 数组。

识别规则：
- uniform/校服/교복 → outfit: "制服"
- sports wear/체육복/운동복 → outfit: "运动服"
- free clothes → outfit: "便装"
- Taekwondo uniform/태권도복/跆拳道服 → outfit: "跆拳道服"
- Judo uniform/柔道服 → outfit: "柔道服"
- 课表中标注的物品（tablet pc、homework、vest等）→ items 数组，翻译为中文
- weekday 编号：周一=1, 周二=2, 周三=3, 周四=4, 周五=5, 周六=6, 周日=7

如果能从课表标题识别班级名（如 Plato class → "Plato班"），填入 className。
如果能确定是哪个孩子，填入 childName，否则设为 null。

## 返回格式
{
  "events": [
    {
      "title": "事项标题（简洁中文）",
      "date": "YYYY-MM-DD",
      "time": "HH:MM 或 null",
      "end_time": "HH:MM 或 null",
      "location": "地点或null",
      "notes": "备注或空字符串",
      "category": "school/training/medical/family",
      "time_uncertain": false,
      "info_only": false
    }
  ],
  "weekly_prep": [
    {
      "childName": "孩子名或null",
      "className": "班级名或null",
      "days": [
        { "weekday": 1, "outfit": "制服", "items": ["平板电脑", "作业"] },
        { "weekday": 2, "outfit": "运动服", "items": [] }
      ]
    }
  ],
  "info_notes": [
    { "content": "仅供了解的信息" }
  ]
}

如果没有穿搭/携带物信息，不要返回 weekly_prep 字段。
只返回JSON对象，不要任何其他内容。`

exports.main = async (event) => {
  const { fileID, currentDate } = event
  const QWEN_API_KEY = process.env.QWEN_API_KEY

  if (!fileID) {
    return { success: false, error: '请提供图片文件' }
  }

  if (!QWEN_API_KEY) {
    return { success: false, error: 'Qwen API Key 未配置' }
  }

  try {
    // Download image from cloud storage
    const fileRes = await cloud.downloadFile({ fileID })
    const buffer = fileRes.fileContent
    const base64 = buffer.toString('base64')
    const dataUrl = `data:image/jpeg;base64,${base64}`

    const prompt = SYSTEM_PROMPT.replace('{currentDate}', currentDate)

    const response = await axios.post('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      model: 'qwen-vl-max',
      messages: [
        { role: 'system', content: prompt },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: `当前日期：${currentDate}。请识别图片中的日程信息。` }
          ]
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${QWEN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    })

    const content = response.data.choices[0].message.content
    let data
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      data = JSON.parse(jsonMatch ? jsonMatch[0] : content)
    } catch (e) {
      return { success: false, error: '解析AI返回结果失败', raw: content }
    }

    return { success: true, data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
