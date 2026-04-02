const storage = require('../../utils/storage.js')
const dateUtil = require('../../utils/date.js')
const weatherUtil = require('../../utils/weather.js')

Page({
  data: {
    statusBarHeight: 0,
    navHeight: 0,
    currentYearMonth: '',
    weather: null,
    events: [],
    selectedDate: '',
    groupedEvents: [],
    modalVisible: false,
    fabX: 0,
    fabY: 0
  },

  onLoad() {
    const rect = wx.getMenuButtonBoundingClientRect()
    const { statusBarHeight } = wx.getWindowInfo()
    const { windowWidth, windowHeight } = wx.getWindowInfo()
    const menuBtnMarginTop = rect.top - statusBarHeight
    const navHeight = rect.bottom + 8

    const now = new Date()
    const currentYearMonth = `${now.getFullYear()}年${now.getMonth() + 1}月`

    // FAB initial position: right-bottom corner
    const fabSize = 56  // 112rpx / 2
    const fabX = windowWidth - fabSize - 24
    const fabY = windowHeight - fabSize - 84 - 50  // 84 = tabbar height, 50 = margin

    this.setData({
      statusBarHeight,
      menuBtnHeight: rect.height,
      menuBtnMarginTop,
      navHeight,
      currentYearMonth,
      selectedDate: dateUtil.formatDate(now),
      fabX,
      fabY
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
    const selected = this.data.selectedDate || today
    const weekLater = dateUtil.addDays(today, 7)

    // Collect all visible events: selected date + upcoming 7 days
    const visible = events.filter(e => {
      if (e.info_only) return false
      // Always show selected date events (even past/completed)
      if (e.date === selected) return true
      // Show upcoming 7 days (exclude completed)
      if (e.date >= today && e.date <= weekLater && !e.completed) return true
      return false
    })

    // Sort all by date, then by time
    visible.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      if (a.time && b.time) return a.time.localeCompare(b.time)
      return a.time ? -1 : 1
    })

    // Group by date
    const groups = []
    const dateMap = {}
    visible.forEach(evt => {
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
    this.loadEvents()
  },

  onFabTouchStart(e) {
    this._fabStartX = e.touches[0].clientX
    this._fabStartY = e.touches[0].clientY
    this._fabOriginX = this.data.fabX
    this._fabOriginY = this.data.fabY
    this._fabMoved = false
  },

  onFabTouchMove(e) {
    const dx = e.touches[0].clientX - this._fabStartX
    const dy = e.touches[0].clientY - this._fabStartY
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      this._fabMoved = true
    }
    const { windowWidth, windowHeight } = wx.getWindowInfo()
    const size = 56
    const x = Math.max(0, Math.min(windowWidth - size, this._fabOriginX + dx))
    const y = Math.max(0, Math.min(windowHeight - size, this._fabOriginY + dy))
    this.setData({ fabX: x, fabY: y })
  },

  onFabTouchEnd() {
    if (!this._fabMoved) {
      this.setData({ modalVisible: true })
    }
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

  onActionDone() {
    this.loadEvents()
  },

  onWeeklyPrep(e) {
    const weeklyPrep = this.selectComponent('#weeklyPrep')
    if (weeklyPrep) {
      const prepData = e.detail.prepData
      // Ensure array format
      const prepArray = Array.isArray(prepData) ? prepData : [prepData]
      weeklyPrep.updateFromAI(prepArray)
    }
  },

  onClearPrep() {
    const weeklyPrep = this.selectComponent('#weeklyPrep')
    if (weeklyPrep) {
      weeklyPrep.clearData()
    }
  },

  onEventDelete(e) {
    storage.deleteEvent(e.detail.id)
    this.loadEvents()
    wx.showToast({ title: '已删除', icon: 'success' })
  }
})
