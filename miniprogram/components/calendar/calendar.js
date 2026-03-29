const dateUtil = require('../../utils/date.js')

Component({
  properties: {
    events: {
      type: Array,
      value: []
    },
    selectedDate: {
      type: String,
      value: ''
    }
  },

  data: {
    year: 0,
    month: 0,
    grid: [],
    weekdays: dateUtil.WEEKDAYS_SHORT
  },

  lifetimes: {
    attached() {
      const now = new Date()
      this.setData({
        year: now.getFullYear(),
        month: now.getMonth(),
        selectedDate: this.data.selectedDate || dateUtil.formatDate(now)
      })
      this.buildGrid()
    }
  },

  observers: {
    'events, year, month'() {
      this.buildGrid()
    }
  },

  methods: {
    buildGrid() {
      const { year, month, events } = this.data
      const grid = dateUtil.getCalendarGrid(year, month)
      const today = dateUtil.formatDate(new Date())

      grid.forEach(cell => {
        cell.isToday = cell.date === today
        const dayEvents = events.filter(e => e.date === cell.date && !e.info_only)
        const categories = [...new Set(dayEvents.map(e => e.category))]
        cell.dots = categories.slice(0, 3)
      })

      this.setData({ grid })
    },

    prevMonth() {
      let { year, month } = this.data
      month--
      if (month < 0) {
        month = 11
        year--
      }
      this.setData({ year, month })
    },

    nextMonth() {
      let { year, month } = this.data
      month++
      if (month > 11) {
        month = 0
        year++
      }
      this.setData({ year, month })
    },

    onDayTap(e) {
      const date = e.currentTarget.dataset.date
      this.setData({ selectedDate: date })
      this.triggerEvent('dayselect', { date })
    }
  }
})
