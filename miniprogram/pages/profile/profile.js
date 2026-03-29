const storage = require('../../utils/storage.js')

Page({
  data: {
    statusBarHeight: 0,
    navHeight: 0,
    city: '',
    stats: {
      total: 0,
      pending: 0,
      completed: 0
    }
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
    this.setData({
      city,
      stats: {
        total: events.length,
        pending: events.filter(e => !e.completed).length,
        completed: events.filter(e => e.completed).length
      }
    })
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
