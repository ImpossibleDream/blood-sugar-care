/**
 * 看板页面 - 完全匹配 HTML 结构
 * 作品集演示版 · 血糖数据监测系统
 */
const app = getApp()
const { SLOT_NAMES, SLOT_NAMES_SHORT } = require('../../utils/util')
const { calcTrends, calcSlotStats, calcOverviewKPI, calcInjectionStats } = require('../../utils/metrics')

Page({
  data: {
    tabIdx: 1,
    kpiList: [],
    statusBarHeight: 20
  },

  onLoad() {
    var sys = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sys.statusBarHeight })
    this.loadDashboardData()
  },

  onShow() {
    this.loadDashboardData()
  },

  loadDashboardData() {
    var records = app.globalData.demoRecords
    var injections = app.globalData.demoInjections
    if (!records || records.length === 0) {
      var demoData = require('../../utils/demoData')
      records = demoData.records.map(function(r) { return { date: r[0], slotIdx: r[1], value: r[2] } })
      injections = demoData.injections
      app.globalData.demoRecords = records
      app.globalData.demoInjections = injections
    }
    if (!records || records.length === 0) return

    var kpi = calcOverviewKPI(records)
    var injStats = calcInjectionStats(injections)
    var slotStats = calcSlotStats(records)
    var trends = calcTrends(records)

    // 计算医学达标率（4.4-7.0 空腹 / <10.0 餐后）
    var totalRecs = records.length
    var medCompliant = 0
    var alertedCount = 0
    for (var i = 0; i < totalRecs; i++) {
      var r = records[i]
      var isFasting = (r.slotIdx === 0 || r.slotIdx === 6)
      if (isFasting) {
        if (r.value >= 4.4 && r.value <= 7.0) medCompliant++
        if (r.value < 3.9 || r.value > 6.1) alertedCount++
      } else {
        if (r.value < 10.0) medCompliant++
        if (r.value < 3.9 || r.value > 7.8) alertedCount++
      }
    }
    var medRate = totalRecs > 0 ? ((medCompliant / totalRecs) * 100).toFixed(1) : '0'
    var alertPct = totalRecs > 0 ? Math.round((alertedCount / totalRecs) * 100) : 0
 
    // 6 个 KPI 卡片（2×3 排列）
    var kpiList = [
      { label: '监测天数', value: kpi.uniqueDates + '天', color: '#1d1b1b', change: '连续6个月' },
      { label: '有效数据点', value: kpi.totalPoints + '个', color: '#1d1b1b', change: '7时段交叉采集' },
      { label: '整体均值', value: kpi.overallMean + ' mmol/L', color: '#c49a3c', change: '中位数 ' + kpi.overallMedian },
      { label: '医学达标率', value: medRate + '%', color: '#3d8a6a', change: '按4.4-7.0/<10.0标准' },
      { label: '预警阈值', value: '严于标准', color: '#c44a4a', change: '提前' + alertPct + '%发现风险' },
      { label: '注射记录', value: injStats.count + '条', color: '#4a7c7c', change: injStats.currentDose + 'mg维持' + injStats.stableDays + '天' }
    ]
    this.setData({ kpiList: kpiList })

    // 环形图图例数据
    var donutLabels = ['空腹', '早餐后2h', '午餐前', '午餐后2h', '晚餐前', '晚餐后2h', '3:00']
    var donutColors = ['#c49a3c', '#4a7c7c', '#c44a4a', '#3d8a6a', '#b0882e', '#6b6864', '#edebe6']
    var donutData = []
    for (var di = 0; di < 7; di++) {
      var s = slotStats[di] || { personal: { high: 0, high_pct: 0 } }
      donutData.push({ label: donutLabels[di], color: donutColors[di], detail: s.personal.high + ' (' + s.personal.high_pct + '%)' })
    }
    this.setData({ donutData: donutData })

    // 保存图表数据供 canvas 绘制
    this._chartData = { records, injections, slotStats, trends, kpi }
    var that = this
    setTimeout(function() { that.drawAllCharts() }, 600)
  },

  drawAllCharts() {
    if (!this._chartData) return
    var chart = require('../../utils/chart')
    var d = this._chartData
    var records = d.records
    var slotStats = d.slotStats
    var trends = d.trends
    var injections = d.injections
    var monthLabels = trends.monthLabels || []
    var that = this

    // 1. 折线图：月度趋势
    this.drawCanvas('c1', function(canvas, ctx, w, h) {
      var lineSeries = []
      var slotColors = ['空腹', '早餐后', '午餐前', '午餐后', '晚餐前', '晚餐后', '3:00']
      for (var si = 0; si < 7; si++) {
        if (trends.slotTrend[si]) {
          var vals = monthLabels.map(function(m) { return trends.slotTrend[si][m] || 0 })
          lineSeries.push({ name: slotColors[si], values: vals })
        }
      }
      var labels = monthLabels.map(function(m) { return m.replace('-', '/') })
      chart.drawLineChart(canvas, ctx, { labels: labels, series: lineSeries })
    })

    // 2. 柱状图：双轨预警对比
    this.drawCanvas('c2', function(canvas, ctx, w, h) {
      if (slotStats.length > 0) {
        var slotLabels = SLOT_NAMES_SHORT
        var personalPct = slotStats.map(function(s) { return +(s.personal.normal_pct || 0) })
        var medicalPct = slotStats.map(function(s) { return +(s.medical.normal_pct || 0) })
        chart.drawBarChart(canvas, ctx, {
          labels: slotLabels,
          series: [
            { name: '个人阈值', values: personalPct },
            { name: '医学标准', values: medicalPct }
          ]
        })
      }
    })

    // 3. 环形图：预警占比
    this.drawCanvas('c3', function(canvas, ctx, w, h) {
      if (slotStats.length > 0) {
        var highCounts = slotStats.map(function(s) { return s.personal.high || 0 })
        chart.drawDonutChart(canvas, ctx, { labels: SLOT_NAMES_SHORT, values: highCounts })
      }
    })

    // 4. 组合图：注射剂量 vs 空腹血糖
    this.drawCanvas('c4', function(canvas, ctx, w, h) {
      if (injections && Object.keys(injections).length > 0) {
        var injDates = Object.keys(injections).sort()
        var monthCounts = {}
        for (var i = 0; i < injDates.length; i++) {
          var m = injDates[i].substring(0, 7)
          if (!monthCounts[m]) monthCounts[m] = { sumDose: 0, sumSugar: 0, count: 0 }
          monthCounts[m].sumDose += injections[injDates[i]]
          monthCounts[m].count++
        }
        for (var i = 0; i < records.length; i++) {
          var m = records[i].date.substring(0, 7)
          if (monthCounts[m]) monthCounts[m].sumSugar += records[i].value
        }
        var sortedMonths = Object.keys(monthCounts).sort()
        var labels = []
        var doseData = []
        var sugarData = []
        for (var i = 0; i < sortedMonths.length; i++) {
          labels.push(sortedMonths[i].replace('-', '/'))
          doseData.push(+(monthCounts[sortedMonths[i]].sumDose / monthCounts[sortedMonths[i]].count).toFixed(2))
          sugarData.push(+(monthCounts[sortedMonths[i]].sumSugar / monthCounts[sortedMonths[i]].count).toFixed(2))
        }
        chart.drawComboChart(canvas, ctx, {
          labels: labels,
          series: [
            { name: '空腹血糖', values: sugarData },
            { name: '注射剂量', values: doseData }
          ]
        })
      }
    })

    // 5. 分布图
    this.drawCanvas('c5', function(canvas, ctx, w, h) {
      if (slotStats.length > 0) {
        var distSeries = []
        for (var si = 0; si < 7; si++) {
          var slotRecs = records.filter(function(r) { return r.slotIdx === si }).map(function(r) { return r.value })
          distSeries.push({ values: slotRecs.length > 0 ? slotRecs : [0] })
        }
        chart.drawDistributionChart(canvas, ctx, { labels: SLOT_NAMES_SHORT, series: distSeries })
      }
    })

    // 6. 散点图：极值
    this.drawCanvas('c6', function(canvas, ctx, w, h) {
      if (records.length > 0) {
        var sortedByVal = [].concat(records).sort(function(a, b) { return b.value - a.value })
        var top5 = sortedByVal.slice(0, 5)
        var bottom5 = sortedByVal.slice(-5).reverse()
        var points = [].concat(
          top5.map(function(r) { return { label: r.value.toFixed(1), value: r.value, type: 'high' } }),
          bottom5.map(function(r) { return { label: r.value.toFixed(1), value: r.value, type: 'low' } })
        )
        chart.drawScatterChart(canvas, ctx, { points: points })
      }
    })
  },

  drawCanvas(id, drawFn) {
    var sys = wx.getSystemInfoSync()
    var dpr = sys.pixelRatio
    var sw = sys.windowWidth
    var pxRatio = sw / 750
    var fixedW = Math.round(sw - 92 * pxRatio)
    var fixedH = Math.round(340 * pxRatio)
    if (fixedH < 100) fixedH = 160
    if (fixedW < 200) fixedW = 300
    var query = wx.createSelectorQuery()
    query.select('#' + id)
      .fields({ node: true })
      .exec(function(res) {
        if (!res || !res[0]) return
        var canvas = res[0].node
        if (!canvas) return
        canvas.width = Math.round(fixedW * dpr)
        canvas.height = Math.round(fixedH * dpr)
        drawFn(canvas, canvas.getContext('2d'), fixedW, fixedH)
      })
  },

  onTabChange(e) {
    var idx = e.detail.index
    if (idx === this.data.tabIdx) return
    var pages = ['/pages/records/records', '/pages/dashboard/dashboard', '/pages/report/report', '/pages/profile/profile']
    if (idx >= 0 && idx < 4) {
      wx.redirectTo({ url: pages[idx] })
    }
  },

  /** 环形图图例点击 */
  onDonutTap(e) {
    wx.showToast({ title: '看板图例点击', icon: 'none', duration: 2000 })
  }
})
