const storage = require('../../utils/storage')

Page({
  data: {
    statusBarHeight: 0,
    navHeight: 0,
    filter: 'pending',
    catFilter: '',
    events: [],
    filteredEvents: [],
    pendingCount: 0
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    const statusBarHeight = sysInfo.statusBarHeight
    this.setData({
      statusBarHeight,
      navHeight: statusBarHeight + 44
    })
  },

  onShow() {
    this.loadEvents()
  },

  loadEvents() {
    const events = storage.getEvents().filter(e => !e.info_only)
    const pendingCount = events.filter(e => !e.completed).length
    this.setData({ events, pendingCount })
    this.applyFilter()
  },

  applyFilter() {
    const { events, filter, catFilter } = this.data
    let filtered = events

    if (filter === 'pending') {
      filtered = filtered.filter(e => !e.completed)
    } else if (filter === 'completed') {
      filtered = filtered.filter(e => e.completed)
    }

    if (catFilter) {
      filtered = filtered.filter(e => e.category === catFilter)
    }

    filtered.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      if (a.time && b.time) return a.time.localeCompare(b.time)
      return 0
    })

    this.setData({ filteredEvents: filtered })
  },

  setFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.filter })
    this.applyFilter()
  },

  setCatFilter(e) {
    this.setData({ catFilter: e.currentTarget.dataset.cat })
    this.applyFilter()
  },

  toggleComplete(e) {
    const id = e.currentTarget.dataset.id
    const events = this.data.events
    const evt = events.find(e => e.id === id)
    if (evt) {
      const updates = {
        completed: !evt.completed,
        completedAt: !evt.completed ? Date.now() : null
      }
      storage.updateEvent(id, updates)
      this.loadEvents()
    }
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
