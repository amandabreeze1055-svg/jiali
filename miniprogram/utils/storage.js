const EVENTS_KEY = 'jl_events'
const SCHEDULES_KEY = 'jl_schedules'
const WEATHER_KEY = 'jl_weather_cache'
const CITY_KEY = 'jl_city'
const NOTES_KEY = 'jl_notes'

module.exports = {
  getEvents() {
    return wx.getStorageSync(EVENTS_KEY) || []
  },
  setEvents(events) {
    wx.setStorageSync(EVENTS_KEY, events)
  },
  addEvents(newEvents) {
    const events = this.getEvents()
    events.push(...newEvents)
    this.setEvents(events)
    return events
  },
  updateEvent(id, updates) {
    const events = this.getEvents()
    const idx = events.findIndex(e => e.id === id)
    if (idx >= 0) {
      events[idx] = { ...events[idx], ...updates }
      this.setEvents(events)
    }
    return events
  },
  deleteEvent(id) {
    const events = this.getEvents().filter(e => e.id !== id)
    this.setEvents(events)
    return events
  },
  getSchedules() {
    return wx.getStorageSync(SCHEDULES_KEY) || []
  },
  setSchedules(schedules) {
    wx.setStorageSync(SCHEDULES_KEY, schedules)
  },
  getWeatherCache() {
    const cache = wx.getStorageSync(WEATHER_KEY)
    if (!cache) return null
    if (Date.now() - cache.timestamp > 2 * 60 * 60 * 1000) return null
    return cache.data
  },
  setWeatherCache(data) {
    wx.setStorageSync(WEATHER_KEY, { data, timestamp: Date.now() })
  },
  getCity() {
    return wx.getStorageSync(CITY_KEY) || '青岛'
  },
  setCity(city) {
    wx.setStorageSync(CITY_KEY, city)
  },
  getNotes() {
    return wx.getStorageSync(NOTES_KEY) || []
  },
  setNotes(notes) {
    wx.setStorageSync(NOTES_KEY, notes)
  },
  addNote(content) {
    const notes = this.getNotes()
    notes.unshift({
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      content,
      createdAt: Date.now(),
      completed: false
    })
    this.setNotes(notes)
    return notes
  },
  deleteNote(id) {
    const notes = this.getNotes().filter(n => n.id !== id)
    this.setNotes(notes)
    return notes
  },
  completeNote(id) {
    const notes = this.getNotes()
    const idx = notes.findIndex(n => n.id === id)
    if (idx >= 0) notes[idx].completed = true
    this.setNotes(notes)
    return notes
  },
  clearAll() {
    wx.removeStorageSync(EVENTS_KEY)
    wx.removeStorageSync(SCHEDULES_KEY)
    wx.removeStorageSync(WEATHER_KEY)
    wx.removeStorageSync(NOTES_KEY)
  },
  generateId() {
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
  }
}
