/**
 * 图表卡片组件
 * 包装 Canvas 2D 图表，自动管理生命周期
 * 作品集演示 · 血糖数据监测系统
 */
Component({
  properties: {
    title: { type: String, value: '' },
    note: { type: String, value: '' },
    chartType: { type: String, value: 'line' },
    chartData: { type: Object, value: null }
  },
  data: {
    canvasReady: false
  },
  lifetimes: {
    attached() {
      // 等待节点渲染完成
      setTimeout(() => this.initCanvas(), 100)
    }
  },
  observers: {
    'chartData': function(newData) {
      if (newData && this.data.canvasReady) {
        this.renderChart()
      }
    }
  },
  methods: {
    initCanvas() {
      const query = this.createSelectorQuery()
      query.select('#chartCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res || !res[0]) return
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = wx.getSystemInfoSync().pixelRatio
          const w = res[0].width
          const h = res[0].height
          canvas.width = w * dpr
          canvas.height = h * dpr
          this._canvas = canvas
          this._ctx = ctx
          this._dpr = dpr
          this.setData({ canvasReady: true }, () => {
            this.renderChart()
          })
        })
    },
    renderChart() {
      if (!this._canvas || !this._ctx || !this.properties.chartData) return
      const chart = require('../../utils/chart')
      const { chartType, chartData } = this.properties
      switch (chartType) {
        case 'line':
          chart.drawLineChart(this._canvas, this._ctx, chartData)
          break
        case 'bar':
          chart.drawBarChart(this._canvas, this._ctx, chartData)
          break
        case 'donut':
          chart.drawDonutChart(this._canvas, this._ctx, chartData)
          break
        case 'combo':
          chart.drawComboChart(this._canvas, this._ctx, chartData)
          break
        case 'distribution':
          chart.drawDistributionChart(this._canvas, this._ctx, chartData)
          break
        case 'scatter':
          chart.drawScatterChart(this._canvas, this._ctx, chartData)
          break
        default:
          chart.drawLineChart(this._canvas, this._ctx, chartData)
      }
    }
  }
})
