const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const SYSTEM_PROMPT = `你是一个家庭日程助手。用户会粘贴微信聊天记录，你需要从中提取日程事项。

当前日期：{currentDate}

要求：
1. 识别所有包含日期、时间、地点、需要准备事项的信息
2. 支持中文、韩文、英文等多语言混合内容
3. 遇到「明天」「后天」「下周X」等相对时间时，根据当前日期推算绝对日期，并标记 time_uncertain: true
4. 提取需要家长准备的物品清单（衣服、文具、食物等）
5. 区分「需要行动的事项」和「仅供了解的信息」

返回JSON数组，每条包含：
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

只返回JSON数组，不要任何其他内容。`

exports.main = async (event) => {
  const { text, currentDate } = event
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY

  if (!text) {
    return { success: false, error: '请提供需要解析的文字内容' }
  }

  if (!DEEPSEEK_API_KEY) {
    return { success: false, error: 'DeepSeek API Key 未配置' }
  }

  try {
    const prompt = SYSTEM_PROMPT.replace('{currentDate}', currentDate)

    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: text }
      ],
      temperature: 0.1
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })

    const content = response.data.choices[0].message.content
    let data
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      data = JSON.parse(jsonMatch ? jsonMatch[0] : content)
    } catch (e) {
      return { success: false, error: '解析AI返回结果失败', raw: content }
    }

    return { success: true, data }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
