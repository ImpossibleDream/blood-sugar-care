/**
 * 记录表格组件
 * 可筛选、分页显示血糖记录
 * 作品集演示 · 血糖数据监测系统
 */
const { SLOT_NAMES, getStatus } = require('../../utils/util')
Component({
  properties: {
    records: { type: Array, value: [], observer: 'rebuildList' },
    page: { type: Number, value: 1 },
    pageSize: { type: Number, value: 30 }
  },
  data: {
    list: [],
    total: 0,
    totalPages: 1,
    start: 0,
    end: 0,
    pageButtons: []
  },
  methods: {
    rebuildList() {
      const rs = this.properties.records || []
      this.setData({ total: rs.length })
      this.goToPage(1)
    },
    goToPage(n) {
      const rs = this.properties.records || []
      const pageSize = this.properties.pageSize
      const totalPages = Math.max(1, Math.ceil(rs.length / pageSize))
      const page = Math.max(1, Math.min(n, totalPages))
      const start = (page - 1) * pageSize
      const end = Math.min(start + pageSize, rs.length)
      const slice = rs.slice(start, end)
      const list = slice.map(r => {
        const isInj = r.isInjection
        const slotLabel = isInj ? '注射剂量' : (SLOT_NAMES[r.slotIdx] || '未知')
        var disp = isInj ? r.value.toFixed(1) + ' mg' : r.value.toFixed(1) + ' mmol/L'
        let tag = ''
        if (isInj) tag = 'inj'
        else tag = getStatus(r.value, r.slotIdx)
        return { ...r, slotLabel: slotLabel, valueDisplay: disp, tag: tag }
      })
      const buttons = []
      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
          buttons.push({ num: i, active: i === page })
        } else if (buttons[buttons.length - 1].num !== -1) {
          buttons.push({ num: -1, active: false })
        }
      }
      this.setData({ list, page, totalPages, start, end, pageButtons: buttons })
    },
    onPrev() {
      if (this.data.page > 1) this.goToPage(this.data.page - 1)
    },
    onNext() {
      if (this.data.page < this.data.totalPages) this.goToPage(this.data.page + 1)
    },
    onGoPage(e) {
      const n = e.currentTarget.dataset.page
      if (n > 0) this.goToPage(n)
    },
    onEdit(e) {
      this.triggerEvent('edit', { item: e.currentTarget.dataset.item })
    },
    onDelete(e) {
      this.triggerEvent('delete', { item: e.currentTarget.dataset.item })
    }
  }
})
