const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const WEEKDAYS_SHORT = ['日', '一', '二', '三', '四', '五', '六']

function formatDate(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDate(str) {
  const parts = str.split('-')
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
}

function isToday(dateStr) {
  return formatDate(new Date()) === dateStr
}

function isTomorrow(dateStr) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return formatDate(tomorrow) === dateStr
}

function getRelativeLabel(dateStr) {
  if (isToday(dateStr)) return '今天'
  if (isTomorrow(dateStr)) return '明天'
  return ''
}

function getWeekday(dateStr) {
  return WEEKDAYS[parseDate(dateStr).getDay()]
}

function getMonthDays(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay()
}

function formatDateLabel(dateStr) {
  const d = parseDate(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${getWeekday(dateStr)}`
}

function getCalendarGrid(year, month) {
  const days = getMonthDays(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const grid = []

  // Previous month padding
  const prevMonthDays = month === 0 ? getMonthDays(year - 1, 11) : getMonthDays(year, month - 1)
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    grid.push({
      day: d,
      date: formatDate(new Date(y, m, d)),
      currentMonth: false
    })
  }

  // Current month
  for (let d = 1; d <= days; d++) {
    grid.push({
      day: d,
      date: formatDate(new Date(year, month, d)),
      currentMonth: true
    })
  }

  // Next month padding
  const remaining = 42 - grid.length
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1
    const y = month === 11 ? year + 1 : year
    grid.push({
      day: d,
      date: formatDate(new Date(y, m, d)),
      currentMonth: false
    })
  }

  return grid
}

function addDays(dateStr, n) {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + n)
  return formatDate(d)
}

module.exports = {
  WEEKDAYS,
  WEEKDAYS_SHORT,
  formatDate,
  parseDate,
  isToday,
  isTomorrow,
  getRelativeLabel,
  getWeekday,
  getMonthDays,
  getFirstDayOfMonth,
  formatDateLabel,
  getCalendarGrid,
  addDays
}
