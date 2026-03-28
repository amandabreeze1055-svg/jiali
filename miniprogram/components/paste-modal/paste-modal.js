const dateUtil = require('../../utils/date')

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
    parseResult: null
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
        parseResult: null
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

    parseText() {
      if (!this.data.pasteText || this.data.loading) return
      this.setData({ loading: true })

      const currentDate = dateUtil.formatDate(new Date())

      wx.cloud.callFunction({
        name: 'parseText',
        data: {
          text: this.data.pasteText,
          currentDate
        }
      }).then(res => {
        const result = res.result
        if (result.success) {
          this.setData({
            loading: false,
            showResult: true,
            parseResult: {
              type: 'text',
              events: result.data,
              schedules: [],
              info_notes: [],
              summary: `提取了 ${result.data.length} 条事项`
            }
          })
        } else {
          wx.showToast({ title: result.error || '解析失败', icon: 'none' })
          this.setData({ loading: false })
        }
      }).catch(err => {
        wx.showToast({ title: '网络错误，请重试', icon: 'none' })
        this.setData({ loading: false })
      })
    },

    parsePhoto() {
      if (this.data.photos.length === 0 || this.data.loading) return
      this.setData({ loading: true })

      const currentDate = dateUtil.formatDate(new Date())

      // Upload first photo to cloud storage
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
      this.setData({ showResult: false, parseResult: null })
    }
  }
})
