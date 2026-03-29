const dateUtil = require('../../utils/date.js')
const storage = require('../../utils/storage.js')

const CHANGE_LABELS = {
  time: '开始时间',
  end_time: '结束时间',
  date: '日期',
  location: '地点',
  notes: '备注',
  title: '标题',
  category: '分类'
}

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },

  data: {
    activeTab: 'paste',
    pasteText: '',
    photos: [],
    photoFileIDs: [],
    loading: false,
    showResult: false,
    parseResult: null,
    // Delete/Modify state
    showActionConfirm: false,
    actionType: '',
    actionDescription: '',
    matchedEvents: [],
    changesList: [],
    pendingChanges: null,
    pendingMatch: null,
    pastePlaceholder: '粘贴微信聊天记录、学校通知等文字内容...\n\n也可以输入指令，如：\n· 把柔道课全部删掉\n· 篮球课改到每周六下午3点'
  },

  methods: {
    onClose() {
      this.resetState()
      this.triggerEvent('close')
    },

    stopPropagation() {},

    resetState() {
      this.setData({
        activeTab: 'paste',
        pasteText: '',
        photos: [],
        photoFileIDs: [],
        loading: false,
        showResult: false,
        parseResult: null,
        showActionConfirm: false,
        actionType: '',
        actionDescription: '',
        matchedEvents: [],
        changesList: [],
        pendingChanges: null,
        pendingMatch: null
      })
    },

    switchTab(e) {
      this.setData({ activeTab: e.currentTarget.dataset.tab })
    },

    onPasteInput(e) {
      this.setData({ pasteText: e.detail.value })
    },

    choosePhoto() {
      wx.chooseMedia({
        count: 4 - this.data.photos.length,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const newPhotos = res.tempFiles.map(f => f.tempFilePath)
          this.setData({
            photos: [...this.data.photos, ...newPhotos]
          })
        }
      })
    },

    _matchEvents(match) {
      const events = storage.getEvents()
      return events.filter(e => {
        let matched = true
        if (match.title_keyword) {
          matched = matched && e.title.includes(match.title_keyword)
        }
        if (match.category) {
          matched = matched && e.category === match.category
        }
        if (match.date_range) {
          matched = matched && e.date >= match.date_range.from && e.date <= match.date_range.to
        }
        return matched
      })
    },

    parseText() {
      if (!this.data.pasteText || this.data.loading) return
      this.setData({ loading: true })

      const now = new Date()
      const currentDate = dateUtil.formatDate(now)
      const currentWeekday = dateUtil.WEEKDAYS[now.getDay()]

      wx.cloud.callFunction({
        name: 'parseText',
        data: {
          text: this.data.pasteText,
          currentDate,
          currentWeekday
        }
      }).then(res => {
        const result = res.result
        if (!result.success) {
          wx.showToast({ title: result.error || '解析失败', icon: 'none' })
          this.setData({ loading: false })
          return
        }

        const data = result.data
        const action = data.action || 'add'

        if (action === 'add') {
          // Original add flow
          const events = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])
          this.setData({
            loading: false,
            showResult: true,
            parseResult: {
              type: 'text',
              events,
              schedules: [],
              info_notes: [],
              summary: `提取了 ${events.length} 条事项`
            }
          })
        } else if (action === 'delete') {
          const matched = this._matchEvents(data.match || {})
          this.setData({
            loading: false,
            showActionConfirm: true,
            actionType: 'delete',
            actionDescription: data.description || '删除匹配的事项',
            matchedEvents: matched,
            pendingMatch: data.match
          })
        } else if (action === 'modify') {
          const matched = this._matchEvents(data.match || {})
          const changes = data.changes || {}
          const changesList = Object.keys(changes).map(k => ({
            label: CHANGE_LABELS[k] || k,
            value: changes[k]
          }))
          this.setData({
            loading: false,
            showActionConfirm: true,
            actionType: 'modify',
            actionDescription: data.description || '修改匹配的事项',
            matchedEvents: matched,
            changesList,
            pendingChanges: changes,
            pendingMatch: data.match
          })
        }
      }).catch(err => {
        wx.showToast({ title: '网络错误，请重试', icon: 'none' })
        this.setData({ loading: false })
      })
    },

    executeAction() {
      const { actionType, matchedEvents, pendingChanges } = this.data

      if (actionType === 'delete') {
        const ids = matchedEvents.map(e => e.id)
        const events = storage.getEvents().filter(e => !ids.includes(e.id))
        storage.setEvents(events)
        wx.showToast({ title: `已删除 ${ids.length} 条事项`, icon: 'success' })
      } else if (actionType === 'modify') {
        matchedEvents.forEach(evt => {
          storage.updateEvent(evt.id, pendingChanges)
        })
        wx.showToast({ title: `已修改 ${matchedEvents.length} 条事项`, icon: 'success' })
      }

      this.triggerEvent('actiondone')
      this.resetState()
      this.triggerEvent('close')
    },

    parsePhoto() {
      if (this.data.photos.length === 0 || this.data.loading) return
      this.setData({ loading: true })

      const currentDate = dateUtil.formatDate(new Date())

      const filePath = this.data.photos[0]
      const cloudPath = `parse_photos/${Date.now()}_${Math.random().toString(36).substr(2, 6)}.jpg`

      wx.cloud.uploadFile({
        cloudPath,
        filePath,
        success: (uploadRes) => {
          wx.cloud.callFunction({
            name: 'parsePhoto',
            data: {
              fileID: uploadRes.fileID,
              currentDate
            }
          }).then(res => {
            const result = res.result
            if (result.success) {
              const data = result.data
              const totalEvents = (data.events || []).length
              const totalSchedules = (data.schedules || []).length
              this.setData({
                loading: false,
                showResult: true,
                parseResult: {
                  type: 'photo',
                  events: data.events || [],
                  schedules: data.schedules || [],
                  info_notes: data.info_notes || [],
                  summary: `识别到 ${this.data.photos.length} 份文件，提取 ${totalEvents} 条事项${totalSchedules > 0 ? '，' + totalSchedules + ' 份课表' : ''}`
                }
              })
            } else {
              wx.showToast({ title: result.error || '解析失败', icon: 'none' })
              this.setData({ loading: false })
            }
          }).catch(() => {
            wx.showToast({ title: '网络错误，请重试', icon: 'none' })
            this.setData({ loading: false })
          })
        },
        fail: () => {
          wx.showToast({ title: '图片上传失败', icon: 'none' })
          this.setData({ loading: false })
        }
      })
    },

    onConfirmAdd(e) {
      this.triggerEvent('addevents', e.detail)
      this.resetState()
      this.triggerEvent('close')
    },

    onBackToInput() {
      this.setData({
        showResult: false,
        parseResult: null,
        showActionConfirm: false,
        actionType: '',
        matchedEvents: [],
        changesList: [],
        pendingChanges: null,
        pendingMatch: null
      })
    }
  }
})
