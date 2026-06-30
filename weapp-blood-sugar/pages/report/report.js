/**
 * 报告页面
 * ===============================================
 * 作品集演示版 · 血糖数据监测系统
 * 功能：日期范围选择、统计摘要、图表预览、报告保存
 * ===============================================
 */
const app = getApp()
const { SLOT_NAMES, formatDate, getStatus } = require('../../utils/util')
const { calcOverviewKPI, calcTrends, calcSlotStats } = require('../../utils/metrics')

Page({
  data: {
    tabIdx: 2,
    rptFrom: '',
    rptTo: '',
    loaded: false,
    stats: [],
    recentRecords: []
  },

  onLoad() {
    var sys = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sys.statusBarHeight })
    const today = formatDate(new Date())
    const monthAgo = new Date()
    monthAgo.setDate(monthAgo.getDate() - 30)
    this.setData({
      rptFrom: formatDate(monthAgo),
      rptTo: today
    })
    this.refreshPreview()
  },

  onRptFromChange(e) {
    this.setData({ rptFrom: e.detail.value })
  },

  onRptToChange(e) {
    this.setData({ rptTo: e.detail.value })
  },

  refreshPreview() {
    wx.showLoading({ title: '刷新报告...' })
    const { rptFrom, rptTo } = this.data
    let records = app.globalData.demoRecords || []
    let filtered = records.filter(r => {
      if (rptFrom && r.date < rptFrom) return false
      if (rptTo && r.date > rptTo) return false
      return true
    })
    if (filtered.length === 0) {
      wx.hideLoading()
      this.setData({ loaded: false, stats: [], recentRecords: [] })
      wx.showToast({ title: '所选范围无数据', icon: 'none' })
      return
    }

    const kpi = calcOverviewKPI(filtered)
    var slotStats = calcSlotStats(filtered)
    var donutLabels = ['空腹', '早餐后2h', '午餐前', '午餐后2h', '晚餐前', '晚餐后2h', '3:00']
    var donutColors = ['#c49a3c', '#4a7c7c', '#c44a4a', '#3d8a6a', '#b0882e', '#6b6864', '#edebe6']
    var donutData = []
    for (var di = 0; di < 7; di++) {
      var s = slotStats[di] || { personal: { high: 0, high_pct: 0 } }
      donutData.push({ label: donutLabels[di], color: donutColors[di], detail: s.personal.high + ' (' + s.personal.high_pct + '%)' })
    }
    const stats = [
      { label: '数据点', value: kpi.totalPoints, color: '#1d1b1b' },
      { label: '监测天数', value: kpi.uniqueDates, color: '#1d1b1b' },
      { label: '均值', value: kpi.overallMean, color: '#c49a3c', flex: 0.8 },
      { label: '中位数', value: kpi.overallMedian, color: '#4a7c7c', flex: 0.8 }
    ]

    // 近7条
    const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date))
    const recentRecords = sorted.slice(0, 7).map(r => {
      const st = getStatus(r.value, r.slotIdx)
      const tagText = st === 'high' ? '偏高' : st === 'low' ? '偏低' : '正常'
      return {
        id: 'r_' + r.date + '_' + r.slotIdx,
        date: r.date,
        slotName: SLOT_NAMES[r.slotIdx] || '未知',
        valDisplay: r.value.toFixed(1) + ' mmol/L',
        tag: st,
        tagText
      }
    })

    this.setData({ loaded: true, stats, recentRecords })
    this.setData({ donutData: donutData })
    // 延迟绘制图表，确保 canvas 已渲染到 DOM
    var that = this
    setTimeout(function() { that.drawAllReportCharts(filtered) }, 600)
    wx.hideLoading()
  },

  drawReportChart(records) {
    if (!records || records.length === 0) return
    // 按日聚合数据，避免数据点过密
    var dayMap = {}
    for (var i = 0; i < records.length; i++) {
      var r = records[i]
      var key = r.date
      if (!dayMap[key]) dayMap[key] = { sum: 0, count: 0 }
      dayMap[key].sum += r.value
      dayMap[key].count++
    }
    var dates = Object.keys(dayMap).sort()
    var chartValues = dates.map(function(d) { return +(dayMap[d].sum / dayMap[d].count).toFixed(1) })
    var chartLabels = dates.map(function(d) { return d.substring(5) })

    var query = wx.createSelectorQuery()
    query.select('#rptChart')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getSystemInfoSync().pixelRatio
        var w = res[0].width
        var h = res[0].height
        if (w < 100) w = 600
        if (h < 100) h = 460
        canvas.width = w * dpr
        canvas.height = h * dpr
        ctx.scale(dpr, dpr)

        const chart = require('../../utils/chart')
        chart.drawLineChart(canvas, ctx, {
          labels: chartLabels,
          series: [{ name: '血糖', values: chartValues }]
        }, { padding: { top: 30, right: 10, bottom: 40, left: 45 } })
      })
  },

  generateReport() {
    wx.showLoading({ title: '生成中...' })
    const records = app.globalData.demoRecords || []
    const injections = app.globalData.demoInjections || {}

    // 生成文本报告
    const now = new Date()
    let report = '========================================\n'
    report += '  血糖数据监测报告\n'
    report += '  ' + formatDate(now) + '\n'
    report += '========================================\n\n'
    report += '报告范围: ' + (this.data.rptFrom || '全部') + ' 至 ' + (this.data.rptTo || '全部') + '\n'
    report += '总数据点: ' + records.length + '\n'
    report += '注射记录: ' + Object.keys(injections).length + ' 天\n\n'
    report += '各时段均值:\n'
    for (let si = 0; si < 7; si++) {
      const slotRecords = records.filter(r => r.slotIdx === si)
      if (slotRecords.length > 0) {
        const avg = (slotRecords.reduce((a, b) => a + b.value, 0) / slotRecords.length).toFixed(2)
        report += '  ' + SLOT_NAMES[si] + ': ' + avg + ' mmol/L (' + slotRecords.length + ' 条)\n'
      }
    }
    report += '\n近期极值:\n'
    const sorted = [...records].sort((a, b) => b.value - a.value)
    if (sorted.length > 0) {
      report += '  最高: ' + sorted[0].value.toFixed(1) + ' (' + sorted[0].date + ')\n'
      report += '  最低: ' + sorted[sorted.length - 1].value.toFixed(1) + ' (' + sorted[sorted.length - 1].date + ')\n'
    }
    report += '\n-- 报告结束 --\n'
    report += '免责声明: 本报告为个人作品集演示用途，不构成医学建议。\n'

    // 保存到文件
    const fs = wx.getFileSystemManager()
    const filename = '血糖报告_' + formatDate(now) + '.txt'
    const filePath = wx.env.USER_DATA_PATH + '/' + filename
    try {
      fs.writeFileSync(filePath, report, 'utf-8')
      wx.hideLoading()
      wx.openDocument({
        filePath,
        success() { wx.showToast({ title: '报告已保存', icon: 'success' }) },
        fail() {
          wx.showModal({ title: '报告完成', content: '报告已保存至: ' + filename, showCancel: false })
        }
      })
    } catch (e) {
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  }
,
  /** 底部导航切换 */
  onTabChange(e) {
    const idx = e.detail.index
    if (idx === this.data.tabIdx) return
    const pages = ['/pages/records/records', '/pages/dashboard/dashboard', '/pages/report/report', '/pages/profile/profile']
    if (idx >= 0 && idx < 4) {
      wx.redirectTo({ url: pages[idx] })
    }
  },
 
  onDonutTap(e) {
    wx.showToast({ title: '报告图例点击', icon: 'none', duration: 2000 })
  },

  /** 报告页绘制全部 6 张图表 */
  drawAllReportCharts(filtered) {
    if (!filtered || filtered.length === 0) return
    var injections = app.globalData.demoInjections || {}
    var chart = require('../../utils/chart')
    var trends = calcTrends(filtered)
    var slotStats = calcSlotStats(filtered)
    var monthLabels = trends.monthLabels || []
    var sys = wx.getSystemInfoSync()
    var dpr = sys.pixelRatio
    var sw = sys.windowWidth
    var pxRatio = sw / 750
    var cw = Math.round(sw - 92 * pxRatio)
    var ch = Math.round(340 * pxRatio)
    if (ch < 100) ch = 160
    if (cw < 200) cw = 300
    function drw(id, fn) {
      var q = wx.createSelectorQuery()
      q.select('#' + id).fields({ node: true }).exec(function(r) {
        if (!r || !r[0]) return
        var cv = r[0].node
        if (!cv) return
        cv.width = Math.round(cw * dpr)
        cv.height = Math.round(ch * dpr)
        fn(cv, cv.getContext('2d'))
      })
    }
    var slotLabels = ['空腹','早餐后2h','午餐前','午餐后2h','晚餐前','晚餐后2h','3:00']
    var slotColors = ['空腹','早餐后','午餐前','午餐后','晚餐前','晚餐后','3:00']
    drw('rp1', function(cv, ctx) {
      var s = []
      for (var si = 0; si < 7; si++)
        if (trends.slotTrend[si]) s.push({ name: slotColors[si], values: monthLabels.map(function(m) { return trends.slotTrend[si][m] || 0 }) })
      chart.drawLineChart(cv, ctx, { labels: monthLabels.map(function(m) { return m.replace('-', '/') }), series: s })
    })
    drw('rp2', function(cv, ctx) {
      if (slotStats.length > 0) chart.drawBarChart(cv, ctx, { labels: slotLabels, series: [
        { name: '个人阈值', values: slotStats.map(function(s) { return +(s.personal.normal_pct || 0) }) },
        { name: '医学标准', values: slotStats.map(function(s) { return +(s.medical.normal_pct || 0) }) }
      ]})
    })
    drw('rp3', function(cv, ctx) {
      if (slotStats.length > 0) chart.drawDonutChart(cv, ctx, { labels: slotLabels, values: slotStats.map(function(s) { return s.personal.high || 0 }) })
    })
    drw('rp4', function(cv, ctx) {
      if (!injections || Object.keys(injections).length === 0) return
      var dates = Object.keys(injections).sort(), mCounts = {}
      for (var i = 0; i < dates.length; i++) {
        var m = dates[i].substring(0, 7)
        if (!mCounts[m]) mCounts[m] = { sumDose: 0, sumSugar: 0, count: 0 }
        mCounts[m].sumDose += injections[dates[i]]
        mCounts[m].count++
      }
      for (var i = 0; i < filtered.length; i++) {
        var m = filtered[i].date.substring(0, 7)
        if (mCounts[m]) mCounts[m].sumSugar += filtered[i].value
      }
      var months = Object.keys(mCounts).sort(), lbls = [], doses = [], sugars = []
      for (var i = 0; i < months.length; i++) {
        lbls.push(months[i].replace('-', '/'))
        doses.push(+(mCounts[months[i]].sumDose / mCounts[months[i]].count).toFixed(2))
        sugars.push(+(mCounts[months[i]].sumSugar / mCounts[months[i]].count).toFixed(2))
      }
      chart.drawComboChart(cv, ctx, { labels: lbls, series: [{ name: '空腹血糖', values: sugars }, { name: '注射剂量', values: doses }] })
    })
    drw('rp5', function(cv, ctx) {
      if (slotStats.length > 0) {
        var ds = []
        for (var si = 0; si < 7; si++) {
          var vals = filtered.filter(function(r) { return r.slotIdx === si }).map(function(r) { return r.value })
          ds.push({ values: vals.length > 0 ? vals : [0] })
        }
        chart.drawDistributionChart(cv, ctx, { labels: slotLabels, series: ds })
      }
    })
    drw('rp6', function(cv, ctx) {
      if (filtered.length > 0) {
        var s = [].concat(filtered).sort(function(a, b) { return b.value - a.value })
        var pts = [].concat(
          s.slice(0, 5).map(function(r) { return { label: r.value.toFixed(1), value: r.value, type: 'high' } }),
          s.slice(-5).reverse().map(function(r) { return { label: r.value.toFixed(1), value: r.value, type: 'low' } })
        )
        chart.drawScatterChart(cv, ctx, { points: pts })
      }
    })
  },
})
