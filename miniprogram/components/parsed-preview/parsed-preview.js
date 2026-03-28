const storage = require('../../utils/storage')

Component({
  properties: {
    result: {
      type: Object,
      value: null
    }
  },

  methods: {
    goBack() {
      this.triggerEvent('back')
    },

    confirmAdd() {
      const { events, schedules } = this.data.result

      // Add events with IDs
      const newEvents = events.map(evt => ({
        ...evt,
        id: storage.generateId(),
        completed: false,
        completedAt: null,
        createdAt: Date.now(),
        source: this.data.result.type === 'photo' ? 'photo' : 'paste',
        prep_items: evt.prep_items || []
      }))

      // Save schedules if any
      if (schedules && schedules.length > 0) {
        const existing = storage.getSchedules()
        storage.setSchedules([...existing, ...schedules])
      }

      this.triggerEvent('confirm', { events: newEvents })
    }
  }
})
