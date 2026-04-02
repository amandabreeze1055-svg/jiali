const storage = require('../../utils/storage.js')

function timeAgo(ts) {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return `${Math.floor(days / 30)}个月前`
}

Page({
  data: {
    statusBarHeight: 0,
    navHeight: 0,
    city: '',
    stats: { total: 0, pending: 0, completed: 0 },
    notes: [],
    noteCount: 0,
    settingsOpen: false,
    noteModalVisible: false,
    noteInput: ''
  },

  onLoad() {
    const rect = wx.getMenuButtonBoundingClientRect()
    const { statusBarHeight } = wx.getWindowInfo()
    this.setData({
      statusBarHeight,
      menuBtnHeight: rect.height,
      menuBtnMarginTop: rect.top - statusBarHeight,
      navHeight: rect.bottom + 8
    })
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const events = storage.getEvents().filter(e => !e.info_only)
    const city = storage.getCity()
    const rawNotes = storage.getNotes()
    const notes = rawNotes.map(n => ({
      ...n,
      timeAgo: timeAgo(n.createdAt),
      swipeX: 0
    }))

    this.setData({
      city,
      stats: {
        total: events.length,
        pending: events.filter(e => !e.completed).length,
        completed: events.filter(e => e.completed).length
      },
      notes,
      noteCount: notes.filter(n => !n.completed).length
    })
  },

  addNote() {
    wx.showModal({
      title: '添加便签',
      editable: true,
      placeholderText: '输入便签内容',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          storage.addNote(res.content.trim())
          this.loadData()
          wx.showToast({ title: '已添加', icon: 'success' })
        }
      }
    })
  },

  onNoteTouchStart(e) {
    const idx = e.currentTarget.dataset.idx
    this._touchStartX = e.changedTouches[0].clientX
    this._touchIdx = idx
    this._swiping = false
  },

  onNoteTouchMove(e) {
    const dx = e.changedTouches[0].clientX - this._touchStartX
    const dy = e.changedTouches[0].clientY - (this._touchStartY || e.changedTouches[0].clientY)
    if (!this._swiping && Math.abs(dy) > Math.abs(dx)) return
    this._swiping = true
    const swipeX = Math.min(0, Math.max(-280, dx * 2))
    this.setData({ [`notes[${this._touchIdx}].swipeX`]: swipeX })
  },

  onNoteTouchEnd() {
    const idx = this._touchIdx
    const threshold = -140
    const current = this.data.notes[idx].swipeX
    this.setData({
      [`notes[${idx}].swipeX`]: current < threshold ? -280 : 0
    })
  },

  completeNote(e) {
    const id = e.currentTarget.dataset.id
    storage.completeNote(id)
    this.loadData()
    wx.showToast({ title: '已完成', icon: 'success' })
  },

  deleteNote(e) {
    const id = e.currentTarget.dataset.id
    storage.deleteNote(id)
    this.loadData()
    wx.showToast({ title: '已删除', icon: 'success' })
  },

  toggleSettings() {
    this.setData({ settingsOpen: !this.data.settingsOpen })
  },

  showNoteModal() {
    this.setData({ noteModalVisible: true, noteInput: '' })
  },

  hideNoteModal() {
    this.setData({ noteModalVisible: false, noteInput: '' })
  },

  onNoteInput(e) {
    this.setData({ noteInput: e.detail.value })
  },

  submitNote() {
    const content = this.data.noteInput.trim()
    if (!content) return
    storage.addNote(content)
    this.setData({ noteModalVisible: false, noteInput: '' })
    this.loadData()
    wx.showToast({ title: '已添加', icon: 'success' })
  },

  changeCity() {
    wx.showActionSheet({
      itemList: ['青岛', '北京', '上海', '广州', '深圳', '杭州', '成都'],
      success: (res) => {
        const cities = ['青岛', '北京', '上海', '广州', '深圳', '杭州', '成都']
        const city = cities[res.tapIndex]
        storage.setCity(city)
        this.setData({ city })
        wx.showToast({ title: `已切换到${city}`, icon: 'success' })
      }
    })
  },

  clearCompleted() {
    wx.showModal({
      title: '清除已完成事项',
      content: '确定要删除所有已完成的事项吗？此操作不可撤销。',
      success: (res) => {
        if (res.confirm) {
          const events = storage.getEvents().filter(e => !e.completed)
          storage.setEvents(events)
          this.loadData()
          wx.showToast({ title: '已清除', icon: 'success' })
        }
      }
    })
  },

  clearAll() {
    wx.showModal({
      title: '清除全部数据',
      content: '确定要删除所有事项和课表数据吗？此操作不可撤销！',
      confirmColor: '#E8856C',
      success: (res) => {
        if (res.confirm) {
          storage.clearAll()
          this.loadData()
          wx.showToast({ title: '已清除全部数据', icon: 'success' })
        }
      }
    })
  }
})
