const storage = require('../../utils/storage')
const dateUtil = require('../../utils/date')
const weatherUtil = require('../../utils/weather')

Page({
  data: {
    statusBarHeight: 0,
    navHeight: 0,
    currentYearMonth: '',
    weather: null,
    events: [],
    selectedDate: '',
    groupedEvents: [],
    modalVisible: false
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    const statusBarHeight = sysInfo.statusBarHeight
    const navHeight = statusBarHeight + 44

    const now = new Date()
    const currentYearMonth = `${now.getFullYear()}年${now.getMonth() + 1}月`

    this.setData({
      statusBarHeight,
      navHeight,
      currentYearMonth,
      selectedDate: dateUtil.formatDate(now)
    })

    this.loadEvents()
    this.loadWeather()
  },

  onShow() {
    this.loadEvents()
  },

  loadEvents() {
    const events = storage.getEvents()
    const today = dateUtil.formatDate(new Date())

    const upcoming = events
      .filter(e => e.date >= today && !e.completed && !e.info_only)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        if (a.time && b.time) return a.time.localeCompare(b.time)
        return a.time ? -1 : 1
      })

    const groups = []
    const dateMap = {}
    upcoming.forEach(evt => {
      if (!dateMap[evt.date]) {
        dateMap[evt.date] = {
          date: evt.date,
          label: dateUtil.formatDateLabel(evt.date),
          relative: dateUtil.getRelativeLabel(evt.date),
          events: []
        }
        groups.push(dateMap[evt.date])
      }
      dateMap[evt.date].events.push(evt)
    })

    this.setData({ events, groupedEvents: groups })
  },

  loadWeather() {
    weatherUtil.fetchWeather().then(weather => {
      this.setData({ weather })
    })
  },

  onDaySelect(e) {
    this.setData({ selectedDate: e.detail.date })
  },

  onSearch() {
    wx.showToast({ title: '搜索功能开发中', icon: 'none' })
  },

  showModal() {
    this.setData({ modalVisible: true })
  },

  hideModal() {
    this.setData({ modalVisible: false })
  },

  onAddEvents(e) {
    const newEvents = e.detail.events
    storage.addEvents(newEvents)
    this.loadEvents()
    wx.showToast({ title: `已添加 ${newEvents.length} 条事项`, icon: 'success' })
  },

  onEventSave(e) {
    const updated = e.detail.event
    storage.updateEvent(updated.id, updated)
    this.loadEvents()
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  onEventDelete(e) {
    storage.deleteEvent(e.detail.id)
    this.loadEvents()
    wx.showToast({ title: '已删除', icon: 'success' })
  }
})
