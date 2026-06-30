/**
 * 筛选栏组件
 * 作品集演示 · 血糖数据监测系统
 */
const { SLOT_NAMES } = require('../../utils/util')
Component({
  properties: {
    dateFrom: { type: String, value: '' },
    dateTo: { type: String, value: '' },
    slotIdx: { type: Number, value: -1 }
  },
  data: {
    slotOptions: ['全部时段', ...SLOT_NAMES]
  },
  methods: {
    onDateFromChange(e) {
      this.setData({ dateFrom: e.detail.value })
      this.triggerEvent('filterchange', {
        dateFrom: e.detail.value,
        dateTo: this.data.dateTo,
        slotIdx: this.data.slotIdx
      })
    },
    onDateToChange(e) {
      this.setData({ dateTo: e.detail.value })
      this.triggerEvent('filterchange', {
        dateFrom: this.data.dateFrom,
        dateTo: e.detail.value,
        slotIdx: this.data.slotIdx
      })
    },
    onSlotChange(e) {
      const idx = e.detail.value - 1
      this.setData({ slotIdx: idx })
      this.triggerEvent('filterchange', {
        dateFrom: this.data.dateFrom,
        dateTo: this.data.dateTo,
        slotIdx: idx
      })
    },
    onReset() {
      this.setData({ dateFrom: '', dateTo: '', slotIdx: -1 })
      this.triggerEvent('filterchange', {
        dateFrom: '', dateTo: '', slotIdx: -1
      })
    }
  }
})
