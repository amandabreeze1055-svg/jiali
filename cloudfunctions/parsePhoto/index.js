const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const SYSTEM_PROMPT = `你是一个家庭日程助手。用户会上传学校通知单、课表、家长信等图片，你需要从中提取日程事项。

要求：
1. 识别所有包含日期、时间、地点、需要准备事项的信息
2. 支持中文、韩文、英文等多语言混合内容
3. 遇到「明天」「后天」「下周X」等相对时间时，根据当前日期推算绝对日期，并标记 time_uncertain: true
4. 提取需要家长准备的物品清单（衣服、文具、食物等）
5. 区分「需要行动的事项」和「仅供了解的信息」
6. 如果识别到周课表/月课表，提取每天需要穿的服装和携带的物品
7. 课表类信息额外返回 schedule 字段

返回JSON对象：
{
  "events": [
    每条包含：
    - title: 事项标题（简洁中文，格式：「事项名 — 相关人」）
    - date: 日期（YYYY-MM-DD）
    - time: 开始时间（HH:MM，无则null）
    - end_time: 结束时间（HH:MM，无则null）
    - location: 地点（无则null）
    - notes: 备注描述（字符串）
    - prep_items: 需要准备的物品（字符串数组，无则空数组[]）
    - category: 分类（school / training / medical / family）
    - time_uncertain: 是否由相对时间推算（布尔值）
    - info_only: 是否仅为信息记录不需要行动（布尔值）
  ],
  "schedules": [
    课表对象格式：
    { type: "weekly_schedule", title: "XX班课表", date_range: "3/23-3/27", days: [
      { weekday: "周一", date: "2026-03-23", uniform: "校服", items: ["平板电脑","作业"], highlights: ["Speaking","Golf"] }
    ]}
  ],
  "info_notes": [
    仅供了解的信息，如 { content: "全年家长代表是XXX的妈妈" }
  ]
}

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

    const response = await axios.post('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      model: 'qwen-vl-max',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
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
