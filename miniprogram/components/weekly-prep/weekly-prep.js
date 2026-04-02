const dateUtil = require('../../utils/date.js')

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return dateUtil.formatDate(d)
}

function buildDayDates(mondayStr) {
  const days = []
  for (let i = 0; i < 7; i++) {
    days.push(dateUtil.addDays(mondayStr, i))
  }
  return days
}

function buildPrepText(day) {
  const parts = []
  if (day.outfit) parts.push(day.outfit)
  if (day.items && day.items.length) parts.push(...day.items)
  return parts.join('·')
}

function buildDateRange(mondayStr) {
  const mon = dateUtil.parseDate(mondayStr)
  const sun = dateUtil.parseDate(dateUtil.addDays(mondayStr, 6))
  return `${mon.getMonth() + 1}月${mon.getDate()}日 — ${sun.getMonth() + 1}月${sun.getDate()}日`
}

function enrichDays(rawDays, mondayStr, today) {
  const dayDates = buildDayDates(mondayStr)
  // Ensure 7 days
  const full = []
  for (let i = 0; i < 7; i++) {
    const raw = rawDays.find(d => d.weekday === i + 1) || { weekday: i + 1, outfit: '', items: [] }
    const dateStr = dayDates[i]
    const dd = dateUtil.parseDate(dateStr)
    full.push({
      ...raw,
      date: dateStr,
      dateNum: dd.getDate(),
      label: dateUtil.WEEKDAYS[dd.getDay()],
      prepText: buildPrepText(raw),
      hasPrep: !!(raw.outfit || (raw.items && raw.items.length)),
      isToday: dateStr === today
    })
  }
  return full
}

Component({
  data: {
    hasData: false,
    children: [],    // Array of { _id, childName, className, dateRange, days[], editingThis, editDays[] }
    currentMonday: ''
  },

  lifetimes: {
    attached() {
      this.loadData()
    }
  },

  methods: {
    async loadData() {
      const today = dateUtil.formatDate(new Date())
      const currentMonday = getMonday(new Date())

      try {
        const db = wx.cloud.database()
        const res = await db.collection('weekly_prep')
          .orderBy('childName', 'asc').limit(20).get()

        if (res.data.length === 0) {
          this.setData({ hasData: false, currentMonday })
          return
        }

        const children = []
        for (const record of res.data) {
          let weekStart = record.weekStart
          let days = record.days || []
          let needsUpdate = false

          // Week rollover
          if (weekStart !== currentMonday) {
            weekStart = currentMonday
            needsUpdate = true
          }

          const enriched = enrichDays(days, currentMonday, today)

          if (needsUpdate) {
            try {
              await db.collection('weekly_prep').doc(record._id).update({
                data: { weekStart: currentMonday }
              })
            } catch (e) {
              console.warn('周更新失败', e)
            }
          }

          children.push({
            _id: record._id,
            childName: record.childName || '未命名',
            className: record.className || '',
            dateRange: buildDateRange(currentMonday),
            days: enriched,
            editingThis: false,
            editDays: []
          })
        }

        this.setData({ hasData: true, children, currentMonday })
      } catch (e) {
        console.warn('加载准备数据失败', e)
        this.setData({ hasData: false, currentMonday })
      }
    },

    startEdit(e) {
      const idx = e.currentTarget.dataset.childIdx
      const child = this.data.children[idx]
      const editDays = child.days.map(d => ({
        outfit: d.outfit || '',
        itemsText: (d.items || []).join('、')
      }))
      this.setData({
        [`children[${idx}].editingThis`]: true,
        [`children[${idx}].editDays`]: editDays
      })
    },

    cancelEdit(e) {
      const idx = e.currentTarget.dataset.childIdx
      this.setData({
        [`children[${idx}].editingThis`]: false,
        [`children[${idx}].editDays`]: []
      })
    },

    onOutfitInput(e) {
      const { childIdx, dayIdx } = e.currentTarget.dataset
      this.setData({ [`children[${childIdx}].editDays[${dayIdx}].outfit`]: e.detail.value })
    },

    onItemsInput(e) {
      const { childIdx, dayIdx } = e.currentTarget.dataset
      this.setData({ [`children[${childIdx}].editDays[${dayIdx}].itemsText`]: e.detail.value })
    },

    async saveEdit(e) {
      const idx = e.currentTarget.dataset.childIdx
      const child = this.data.children[idx]
      const today = dateUtil.formatDate(new Date())

      const newDays = child.editDays.map((ed, i) => {
        const items = ed.itemsText
          ? ed.itemsText.split(/[,，、\n]/).map(s => s.trim()).filter(Boolean)
          : []
        return { weekday: i + 1, outfit: ed.outfit.trim(), items }
      })

      try {
        const db = wx.cloud.database()
        await db.collection('weekly_prep').doc(child._id).update({
          data: { days: newDays }
        })

        const enriched = enrichDays(newDays, this.data.currentMonday, today)
        this.setData({
          [`children[${idx}].days`]: enriched,
          [`children[${idx}].editingThis`]: false,
          [`children[${idx}].editDays`]: []
        })
        wx.showToast({ title: '已保存', icon: 'success' })
      } catch (e) {
        console.error('保存失败', e)
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    },

    // Add a new child card
    addChild() {
      wx.showModal({
        title: '添加孩子',
        content: '',
        editable: true,
        placeholderText: '输入孩子名字',
        success: async (res) => {
          if (!res.confirm || !res.content || !res.content.trim()) return
          const childName = res.content.trim()

          // Check duplicate
          if (this.data.children.some(c => c.childName === childName)) {
            wx.showToast({ title: '已存在', icon: 'none' })
            return
          }

          const currentMonday = this.data.currentMonday || getMonday(new Date())
          const today = dateUtil.formatDate(new Date())
          const emptyDays = []
          for (let i = 0; i < 7; i++) {
            emptyDays.push({ weekday: i + 1, outfit: '', items: [] })
          }

          try {
            const db = wx.cloud.database()
            const addRes = await db.collection('weekly_prep').add({
              data: { childName, className: '', weekStart: currentMonday, days: emptyDays }
            })

            const enriched = enrichDays(emptyDays, currentMonday, today)
            const newChild = {
              _id: addRes._id,
              childName,
              className: '',
              dateRange: buildDateRange(currentMonday),
              days: enriched,
              editingThis: true,
              editDays: enriched.map(d => ({ outfit: '', itemsText: '' }))
            }

            const children = [...this.data.children, newChild]
            this.setData({ hasData: true, children, currentMonday })
          } catch (e) {
            console.error('添加失败', e)
            wx.showToast({ title: '添加失败', icon: 'none' })
          }
        }
      })
    },

    // Delete a child card
    deleteChild(e) {
      const idx = e.currentTarget.dataset.childIdx
      const child = this.data.children[idx]

      wx.showModal({
        title: '确认删除',
        content: `删除 ${child.childName} 的本周准备？`,
        success: async (res) => {
          if (!res.confirm) return
          try {
            const db = wx.cloud.database()
            await db.collection('weekly_prep').doc(child._id).remove()

            const children = this.data.children.filter((_, i) => i !== idx)
            this.setData({ children, hasData: children.length > 0 })
            wx.showToast({ title: '已删除', icon: 'success' })
          } catch (e) {
            console.error('删除失败', e)
          }
        }
      })
    },

    // Called by parent when AI returns weekly_prep data
    async updateFromAI(prepArray) {
      const currentMonday = this.data.currentMonday || getMonday(new Date())
      const today = dateUtil.formatDate(new Date())
      const db = wx.cloud.database()

      for (const prep of prepArray) {
        let childName = prep.childName

        // If no childName, ask user
        if (!childName) {
          childName = await this._askChildName()
          if (!childName) continue
        }

        // Find existing child
        const existingIdx = this.data.children.findIndex(c => c.childName === childName)

        if (existingIdx >= 0) {
          // Merge with existing
          const existing = this.data.children[existingIdx]
          const mergedDays = []
          for (let i = 0; i < 7; i++) {
            const old = existing.days[i] || { weekday: i + 1, outfit: '', items: [] }
            const aiDay = prep.days.find(d => d.weekday === i + 1)
            if (aiDay) {
              const mergedOutfit = aiDay.outfit || old.outfit || ''
              const mergedItems = [...new Set([...(old.items || []), ...(aiDay.items || [])])]
              mergedDays.push({ weekday: i + 1, outfit: mergedOutfit, items: mergedItems })
            } else {
              mergedDays.push({ weekday: i + 1, outfit: old.outfit || '', items: old.items || [] })
            }
          }

          await db.collection('weekly_prep').doc(existing._id).update({
            data: { days: mergedDays, weekStart: currentMonday }
          })

          const enriched = enrichDays(mergedDays, currentMonday, today)
          this.setData({
            [`children[${existingIdx}].days`]: enriched,
            [`children[${existingIdx}].dateRange`]: buildDateRange(currentMonday)
          })
        } else {
          // New child
          const fullDays = []
          for (let i = 0; i < 7; i++) {
            const aiDay = prep.days.find(d => d.weekday === i + 1)
            fullDays.push({
              weekday: i + 1,
              outfit: aiDay ? (aiDay.outfit || '') : '',
              items: aiDay ? (aiDay.items || []) : []
            })
          }

          const addRes = await db.collection('weekly_prep').add({
            data: {
              childName,
              className: prep.className || '',
              weekStart: currentMonday,
              days: fullDays
            }
          })

          const enriched = enrichDays(fullDays, currentMonday, today)
          const newChild = {
            _id: addRes._id,
            childName,
            className: prep.className || '',
            dateRange: buildDateRange(currentMonday),
            days: enriched,
            editingThis: false,
            editDays: []
          }

          const children = [...this.data.children, newChild]
          this.setData({ hasData: true, children })
        }
      }
    },

    _askChildName() {
      return new Promise((resolve) => {
        const existing = this.data.children.map(c => c.childName)
        if (existing.length > 0) {
          wx.showActionSheet({
            itemList: [...existing, '+ 新孩子'],
            success: (res) => {
              if (res.tapIndex < existing.length) {
                resolve(existing[res.tapIndex])
              } else {
                wx.showModal({
                  title: '输入孩子名字',
                  editable: true,
                  placeholderText: '名字',
                  success: (r) => resolve(r.confirm && r.content ? r.content.trim() : null)
                })
              }
            },
            fail: () => resolve(null)
          })
        } else {
          wx.showModal({
            title: '输入孩子名字',
            editable: true,
            placeholderText: '名字',
            success: (r) => resolve(r.confirm && r.content ? r.content.trim() : null)
          })
        }
      })
    },

    async clearData() {
      try {
        const db = wx.cloud.database()
        for (const child of this.data.children) {
          if (child._id) {
            await db.collection('weekly_prep').doc(child._id).remove()
          }
        }
        this.setData({ hasData: false, children: [] })
        wx.showToast({ title: '已清除', icon: 'success' })
      } catch (e) {
        console.error('清除失败', e)
        wx.showToast({ title: '清除失败', icon: 'none' })
      }
    }
  }
})
