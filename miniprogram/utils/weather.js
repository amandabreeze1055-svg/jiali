const storage = require('./storage')

const WEATHER_ICONS = {
  '晴': '☀️',
  '多云': '⛅',
  '阴': '☁️',
  '小雨': '🌦️',
  '中雨': '🌧️',
  '大雨': '🌧️',
  '雷阵雨': '⛈️',
  '雪': '🌨️',
  '雾': '🌫️'
}

function getWeatherIcon(condition) {
  return WEATHER_ICONS[condition] || '🌤️'
}

function getMockWeather() {
  const today = new Date()
  const days = []
  const conditions = ['晴', '多云', '晴', '小雨', '多云']
  const temps = [[8, 18], [6, 15], [7, 16], [5, 12], [6, 14]]
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

  for (let i = 0; i < 5; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    days.push({
      date: d,
      weekday: weekdays[d.getDay()],
      condition: conditions[i],
      icon: getWeatherIcon(conditions[i]),
      tempLow: temps[i][0],
      tempHigh: temps[i][1]
    })
  }

  return {
    city: storage.getCity(),
    today: days[0],
    forecast: days.slice(1)
  }
}

function fetchWeather() {
  return new Promise((resolve) => {
    const cached = storage.getWeatherCache()
    if (cached) {
      resolve(cached)
      return
    }
    // TODO: Replace with real API call (和风天气/OpenWeatherMap)
    // For now, return mock data
    const data = getMockWeather()
    storage.setWeatherCache(data)
    resolve(data)
  })
}

module.exports = {
  fetchWeather,
  getWeatherIcon
}
