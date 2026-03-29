const dateUtil = require('../../utils/date.js')

const CATEGORY_LABELS = {
  school: '学校',
  training: '培训',
  medical: '医疗',
  family: '家庭'
}

const CATEGORIES = [
  { value: 'school', label: '学校' },
  { value: 'training', label: '培训' },
  { value: 'medical', label: '医疗' },
  { value: 'family', label: '家庭' }
]

Component({
  properties: {
    event: {
      type: Object,
      value: {}
    }
  },

  data: {
    editing: false,
    editData: {},
    checkedItems: {},
    categoryLabel: '',
    dateLabel: '',
    noteLines: [],
    swipeX: 0,
    categories: CATEGORIES
  },

  lifetimes: {
    attached() {
      this._updateDerived()
    }
  },

  observers: {
    'event'() {
      this._updateDerived()
    }
  },

  methods: {
    _updateDerived() {
      const evt = this.data.event
      if (!evt || !evt.date) return

      const categoryLabel = CATEGORY_LABELS[evt.category] || '其他'

      // Date label: "3月28日 周六（今天）"
      const d = dateUtil.parseDate(evt.date)
      const monthDay = `${d.getMonth() + 1}月${d.getDate()}日`
      const weekday = dateUtil.getWeekday(evt.date)
      const relative = dateUtil.getRelativeLabel(evt.date)
      const dateLabel = relative ? `${monthDay} ${weekday}（${relative}）` : `${monthDay} ${weekday}`

      // Split notes into lines
      const noteLines = evt.notes
        ? evt.notes.split('\n').filter(l => l.trim())
        : []

      this.setData({ categoryLabel, dateLabel, noteLines })
    },

    onTouchStart(e) {
      this._touchStartX = e.changedTouches[0].clientX
      this._touchStartY = e.changedTouches[0].clientY
      this._swiping = false
    },

    onTouchMove(e) {
      const dx = e.changedTouches[0].clientX - this._touchStartX
      const dy = e.changedTouches[0].clientY - this._touchStartY

      // If vertical scroll is dominant, don't swipe
      if (!this._swiping && Math.abs(dy) > Math.abs(dx)) return
      this._swiping = true

      // Only allow left swipe (negative dx), convert px to rpx (*2)
      const swipeX = Math.min(0, Math.max(-160, dx * 2))
      this.setData({ swipeX })
    },

    onTouchEnd() {
      // Snap: if swiped more than half, open; otherwise close
      const threshold = -80
      this.setData({
        swipeX: this.data.swipeX < threshold ? -160 : 0
      })
    },

    swipeDelete() {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这条事项吗？',
        success: (res) => {
          if (res.confirm) {
            this.triggerEvent('delete', { id: this.data.event.id })
          }
          this.setData({ swipeX: 0 })
        }
      })
    },

    copyEvent() {
      const evt = this.data.event
      const d = dateUtil.parseDate(evt.date)
      const monthDay = `${d.getMonth() + 1}月${d.getDate()}日`
      const weekday = dateUtil.getWeekday(evt.date)
      const timePart = evt.time
        ? ` ${evt.time}${evt.end_time ? '-' + evt.end_time : ''}`
        : ''

      let text = `📅 ${evt.title}\n🕐 ${monthDay} ${weekday}${timePart}`

      if (evt.location) {
        text += `\n📍 ${evt.location}`
      }

      if (evt.notes && evt.notes.trim()) {
        text += `\n\n备注：\n${evt.notes}`
      }

      if (evt.prep_items && evt.prep_items.length > 0) {
        text += `\n\n需要准备：\n${evt.prep_items.map(i => `□ ${i}`).join('\n')}`
      }

      wx.setClipboardData({
        data: text,
        success: () => {
          wx.showToast({ title: '已复制，可粘贴发送', icon: 'none' })
        }
      })
    },

    toggleEdit() {
      if (this.data.editing) return
      this.setData({
        editing: true,
        editData: { ...this.data.event }
      })
    },

    stopPropagation() {},

    cancelEdit() {
      this.setData({ editing: false, editData: {} })
    },

    saveEdit() {
      const saved = { ...this.data.editData, time_uncertain: false }
      this.triggerEvent('save', { event: saved })
      this.setData({ editing: false, editData: {} })
    },

    deleteEvent() {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这条事项吗？',
        success: (res) => {
          if (res.confirm) {
            this.triggerEvent('delete', { id: this.data.event.id })
            this.setData({ editing: false })
          }
        }
      })
    },

    togglePrepItem(e) {
      const idx = e.currentTarget.dataset.index
      const key = `checkedItems.${idx}`
      this.setData({
        [key]: !this.data.checkedItems[idx]
      })
    },

    onEditTitle(e) {
      this.setData({ 'editData.title': e.detail.value })
    },

    onEditDate(e) {
      this.setData({ 'editData.date': e.detail.value })
    },

    onEditTime(e) {
      this.setData({ 'editData.time': e.detail.value })
    },

    onEditLocation(e) {
      this.setData({ 'editData.location': e.detail.value })
    },

    onEditNotes(e) {
      this.setData({ 'editData.notes': e.detail.value })
    },

    onEditCategory(e) {
      this.setData({ 'editData.category': e.currentTarget.dataset.value })
    }
  }
})
