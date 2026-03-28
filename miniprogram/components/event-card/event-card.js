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
    categories: CATEGORIES
  },

  lifetimes: {
    attached() {
      this.setData({
        categoryLabel: CATEGORY_LABELS[this.data.event.category] || '其他'
      })
    }
  },

  observers: {
    'event.category'(val) {
      this.setData({ categoryLabel: CATEGORY_LABELS[val] || '其他' })
    }
  },

  methods: {
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
      this.triggerEvent('save', { event: this.data.editData })
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
