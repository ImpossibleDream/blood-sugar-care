/**
 * 记录明细页面
 * ===============================================
 * 作品集演示版 · 血糖数据监测系统
 * 功能：CRUD 操作、筛选、分页、CSV 导出、数据同步
 * 数据来源：云数据库（优先）或本地缓存（演示模式）
 * ===============================================
 */
const app = getApp()
const { SLOT_NAMES, formatDate, today } = require('../../utils/util')
const { generateCSV } = require('../../utils/csv')

Page({
  data: {
    tabIdx: 0,
    filterDateFrom: '',
    filterDateTo: '',
    filterSlot: -1,
    addDate: formatDate(new Date()),
    addSlot: 0,
    addValue: '',
    slotOptions: SLOT_NAMES,
    allRecords: [],
    displayRecords: [],
    totalRecords: 0,
    currentPage: 1,
    showEditModal: false,
    editIdx: -1,
    editDate: '',
    editSlot: 0,
    editValue: '',
    isInjection: false
  },

  onLoad() {
    var sys = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sys.statusBarHeight })
    this.loadData()
  },

  /** 加载数据（云数据库优先，降级到本地） */
  loadData() {
    wx.showLoading({ title: '加载数据...' })
    if (app.ensureCloudInit()) {
      this.loadFromCloud()
    } else {
      this.loadFromLocal()
    }
  },

  /** 从云数据库加载 */
  loadFromCloud() {
    const cloud = require('../../utils/cloud')
    Promise.all([
      cloud.fetchRecords(),
      cloud.fetchInjections()
    ]).then(([records, injections]) => {
      const all = this.mergeRecords(records, injections)
      app.globalData.dbRecords = records
      app.globalData.dbInjections = injections
      this.setData({ allRecords: all })
      this.applyFilter()
      wx.hideLoading()
    }).catch(() => {
      wx.hideLoading()
      wx.showToast({ title: '云端加载失败，使用本地数据', icon: 'none' })
      this.loadFromLocal()
    })
  },

  /** 从本地缓存加载 */
  loadFromLocal() {
    var records = app.globalData.demoRecords
    var injections = app.globalData.demoInjections
    if (!records) { var demoData = require('../../utils/demoData'); app.globalData.demoRecords = demoData.records.map(function(r) { return {date:r[0], slotIdx:r[1], value:r[2]} }); records = app.globalData.demoRecords }
    if (!injections) { var demoData = require('../../utils/demoData'); app.globalData.demoInjections = demoData.injections; injections = app.globalData.demoInjections }

    // 尝试从 storage 读取
    try {
      const saved = wx.getStorageSync('bs_records')
      const savedInj = wx.getStorageSync('bs_injections')
      if (saved) { records = JSON.parse(saved); app.globalData.demoRecords = records }
      if (savedInj) { injections = JSON.parse(savedInj); app.globalData.demoInjections = injections }
    } catch (e) {}

    const all = this.mergeRecords(records, injections)
    this.setData({ allRecords: all })
    this.applyFilter()
    wx.hideLoading()
  },

  /** 合并血糖记录和注射记录 */
  mergeRecords(records, injections) {
    records = records || []
    injections = injections || {}
    const result = records.map((r, i) => ({
      id: 'r_' + i + '_' + r.date,
      date: r.date,
      slotIdx: r.slotIdx,
      value: r.value,
      isInjection: false,
      sourceIdx: i,
      _raw: r
    }))
    if (injections) {
      let injIdx = 0
      for (const [date, dose] of Object.entries(injections)) {
        result.push({
          id: 'inj_' + injIdx + '_' + date,
          date,
          slotIdx: 7,
          value: dose,
          isInjection: true,
          sourceIdx: -1,
          _raw: { date, dose }
        })
        injIdx++
      }
    }
    result.sort((a, b) => b.date.localeCompare(a.date) || a.slotIdx - b.slotIdx)
    return result
  },

  /** 筛选变化 */
  onFilterChange(e) {
    const { dateFrom, dateTo, slotIdx } = e.detail
    this.setData({
      filterDateFrom: dateFrom,
      filterDateTo: dateTo,
      filterSlot: slotIdx
    })
    this.applyFilter()
  },

  /** 应用筛选 */
  applyFilter() {
    var allRecs = this.data.allRecords
    if (!allRecs) allRecs = []
    let filtered = [...allRecs]
    if (this.data.filterDateFrom) {
      filtered = filtered.filter(r => r.date >= this.data.filterDateFrom)
    }
    if (this.data.filterDateTo) {
      filtered = filtered.filter(r => r.date <= this.data.filterDateTo)
    }
    if (this.data.filterSlot >= 0) {
      filtered = filtered.filter(r => r.slotIdx === this.data.filterSlot)
    }
    this.setData({
      displayRecords: filtered,
      totalRecords: filtered.length,
      currentPage: 1
    })
  },

  /** 添加记录 */
  addRecord() {
    const date = this.data.addDate
    const slotIdx = this.data.addSlot
    const value = parseFloat(this.data.addValue)
    if (!date) { wx.showToast({ title: '请选择日期', icon: 'none' }); return }
    if (isNaN(value) || value <= 0) { wx.showToast({ title: '请输入有效数值', icon: 'none' }); return }

    if (app.ensureCloudInit()) {
      const cloud = require('../../utils/cloud')
      cloud.addRecord(date, slotIdx, value).then(() => {
        wx.showToast({ title: '添加成功', icon: 'success' })
        this.loadFromCloud()
      }).catch(() => {
        wx.showToast({ title: '添加失败', icon: 'none' })
      })
    } else {
      // 本地模式
      const records = JSON.parse(JSON.stringify(app.globalData.demoRecords))
      records.push({ date, slotIdx, value })
      app.globalData.demoRecords = records
      try {
        wx.setStorageSync('bs_records', JSON.stringify(records))
      } catch (e) {}
      this.setData({ addValue: '' })
      wx.showToast({ title: '添加成功', icon: 'success' })
      this.loadFromLocal()
    }
  },

  /** 添加表单字段变化 */
  onAddDateChange(e) { this.setData({ addDate: e.detail.value }) },
  onAddSlotChange(e) { this.setData({ addSlot: e.detail.value }) },
  onAddValueInput(e) { this.setData({ addValue: e.detail.value }) },

  /** 编辑记录 */
  onEditRecord(e) {
    const item = e.detail.item
    this.setData({
      showEditModal: true,
      editIdx: item.sourceIdx,
      editDate: item.date,
      editSlot: item.slotIdx,
      editValue: item.value,
      isInjection: item.isInjection
    })
  },

  /** 编辑字段变化 */
  onEditDateChange(e) { this.setData({ editDate: e.detail.value }) },
  onEditSlotChange(e) { this.setData({ editSlot: e.detail.value }) },
  onEditValueInput(e) { this.setData({ editValue: e.detail.value }) },

  /** 保存编辑 */
  saveEdit() {
    const date = this.data.editDate
    const slotIdx = parseInt(this.data.editSlot)
    const value = parseFloat(this.data.editValue)
    if (!date || isNaN(value) || value <= 0) {
      wx.showToast({ title: '请完善信息', icon: 'none' })
      return
    }

    if (this.data.isInjection) {
      // 注射编辑暂不支持从表格编辑
      wx.showToast({ title: '注射记录请在注射页面编辑', icon: 'none' })
      return
    }

    const idx = this.data.editIdx
    if (idx < 0) return

    if (app.ensureCloudInit()) {
      const cloud = require('../../utils/cloud')
      const record = app.globalData.dbRecords[idx]
      if (record && record._id) {
        cloud.updateRecord(record._id, { date, slotIdx, value }).then(() => {
          wx.showToast({ title: '更新成功', icon: 'success' })
          this.closeEditModal()
          this.loadFromCloud()
        }).catch(() => {
          wx.showToast({ title: '更新失败', icon: 'none' })
        })
      }
    } else {
      app.globalData.demoRecords[idx] = { date, slotIdx, value }
      try {
        wx.setStorageSync('bs_records', JSON.stringify(app.globalData.demoRecords))
      } catch (e) {}
      wx.showToast({ title: '更新成功', icon: 'success' })
      this.closeEditModal()
      this.loadFromLocal()
    }
  },

  closeEditModal() {
    this.setData({ showEditModal: false, editIdx: -1 })
  },

  /** 删除记录 */
  onDeleteRecord(e) {
    const item = e.detail.item
    wx.showModal({
      title: '确认删除',
      content: `删除 ${item.date} ${SLOT_NAMES[item.slotIdx] || ''} 的记录？`,
      success: (res) => {
        if (res.confirm) {
          this.doDelete(item)
        }
      }
    })
  },

  doDelete(item) {
    if (item.isInjection) {
      if (app.ensureCloudInit()) {
        const cloud = require('../../utils/cloud')
        cloud.deleteInjection(item.date).then(() => {
          wx.showToast({ title: '删除成功', icon: 'success' })
          this.loadFromCloud()
        })
      } else {
        const inj = { ...app.globalData.demoInjections }
        delete inj[item.date]
        app.globalData.demoInjections = inj
        try {
          wx.setStorageSync('bs_injections', JSON.stringify(inj))
        } catch (e) {}
        wx.showToast({ title: '删除成功', icon: 'success' })
        this.loadFromLocal()
      }
    } else {
      const idx = item.sourceIdx
      if (idx < 0) return
      if (app.globalData.useCloud) {
        const cloud = require('../../utils/cloud')
        const record = app.globalData.dbRecords[idx]
        if (record && record._id) {
          cloud.deleteRecord(record._id).then(() => {
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadFromCloud()
          })
        }
      } else {
        app.globalData.demoRecords.splice(idx, 1)
        try {
          wx.setStorageSync('bs_records', JSON.stringify(app.globalData.demoRecords))
        } catch (e) {}
        wx.showToast({ title: '删除成功', icon: 'success' })
        this.loadFromLocal()
      }
    }
  },

  /** 导出 CSV */
  exportCSV() {
    const records = app.ensureCloudInit()
      ? app.globalData.dbRecords
      : app.globalData.demoRecords
    const injections = app.ensureCloudInit()
      ? app.globalData.dbInjections
      : app.globalData.demoInjections

    const csvText = generateCSV(records, injections)
    const filename = '血糖数据_' + formatDate(new Date()) + '.csv'
    const fs = wx.getFileSystemManager()
    const filePath = wx.env.USER_DATA_PATH + '/' + filename
    try {
      fs.writeFileSync(filePath, csvText, 'utf-8')
      wx.openDocument({
        filePath,
        fileType: 'csv',
        success() {
          wx.showToast({ title: '导出成功', icon: 'success' })
        },
        fail() {
          wx.showModal({
            title: '导出完成',
            content: '文件已保存至: ' + filename,
            showCancel: false
          })
        }
      })
    } catch (e) {
      wx.showToast({ title: '导出失败', icon: 'none' })
    }
  },

  noop() {},

  /** 底部导航切换 */
  onTabChange(e) {
    const idx = e.detail.index
    if (idx === this.data.tabIdx) return
    const pages = ['/pages/records/records', '/pages/dashboard/dashboard', '/pages/report/report', '/pages/profile/profile']
    if (idx >= 0 && idx < 4) {
      wx.redirectTo({ url: pages[idx] })
    }
  }
})
