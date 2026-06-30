/**
 * Canvas 2D 图表渲染引擎
 * ===============================================
 * 作品集演示标注：纯 Canvas 2D API 实现，无第三方图表库依赖
 * 视觉风格匹配 blood_sugar_dashboard.html
 * 支持：折线图、柱状图、饼图/环形图、组合图、箱线图
 * ===============================================
 */

const { SLOT_NAMES_SHORT } = require('./util')

/** 配色方案（匹配 HTML 设计系统） */
const COLORS = {
  gold: '#c49a3c',
  goldLight: 'rgba(196,154,60,0.15)',
  teal: '#4a7c7c',
  tealLight: 'rgba(74,124,124,0.15)',
  red: '#c44a4a',
  amber: '#c49a3c',
  green: '#3d8a6a',
  text: '#1d1b1b',
  muted: '#9a9690',
  grid: 'rgba(29,27,27,0.06)',
  axis: 'rgba(29,27,27,0.12)',
  personal: '#c49a3c',
  medical: '#4a7c7c',
  fill: 'rgba(196,154,60,0.08)'
}

/** 图表默认配置 */
const DEFAULTS = {
  padding: { top: 40, right: 20, bottom: 50, left: 50 },
  fontSize: 11,
  lineWidth: 2,
  dotRadius: 3
}

/**
 * 绘制折线图（多系列）
 * 对应 HTML 中的 c1: 月度血糖均值趋势
 */
function drawLineChart(canvas, ctx, data, opts = {}) {
  const dpr = wx.getSystemInfoSync().pixelRatio
  const w = canvas.width / dpr
  const h = canvas.height / dpr
  const pad = opts.padding || DEFAULTS.padding
  const cw = w - pad.left - pad.right
  const ch = h - pad.top - pad.bottom

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(dpr, dpr)

  if (!data || !data.labels || data.labels.length === 0) {
    drawEmpty(ctx, w, h)
    return
  }

  // 计算范围
  let minVal = Infinity, maxVal = -Infinity
  for (const series of data.series) {
    for (const v of series.values) {
      if (v < minVal) minVal = v
      if (v > maxVal) maxVal = v
    }
  }
  const range = maxVal - minVal
  const yMin = Math.max(0, Math.floor(minVal - range * 0.1))
  const yMax = Math.ceil(maxVal + range * 0.1)

  const toX = (i) => pad.left + (i / (data.labels.length - 1 || 1)) * cw
  const toY = (v) => pad.top + ch - ((v - yMin) / (yMax - yMin)) * ch

  // 网格线
  ctx.strokeStyle = COLORS.grid
  ctx.lineWidth = 1
  const ySteps = 5
  for (let i = 0; i <= ySteps; i++) {
    const y = pad.top + (i / ySteps) * ch
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(pad.left + cw, y)
    ctx.stroke()
    ctx.fillStyle = COLORS.muted
    ctx.font = `${DEFAULTS.fontSize}px sans-serif`
    ctx.textAlign = 'right'
    ctx.fillText((yMax - (i / ySteps) * (yMax - yMin)).toFixed(1), pad.left - 6, y + 4)
  }

  // X 轴标签
  ctx.textAlign = 'center'
  ctx.fillStyle = COLORS.muted
  for (let i = 0; i < data.labels.length; i++) {
    const x = toX(i)
    ctx.fillText(data.labels[i], x, pad.top + ch + 16)
  }

  // 绘制每个系列
  const colors = [COLORS.gold, COLORS.teal, COLORS.red, COLORS.green, COLORS.amber]
  for (let si = 0; si < data.series.length; si++) {
    const series = data.series[si]
    const color = colors[si % colors.length]
    ctx.strokeStyle = color
    ctx.lineWidth = DEFAULTS.lineWidth
    ctx.lineJoin = 'round'

    const points = series.values.map((v, i) => ({ x: toX(i), y: toY(v) }))

    // 绘制折线
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.stroke()

    // 绘制填充（第一个系列）
    if (si === 0) {
      ctx.beginPath()
      ctx.moveTo(points[0].x, pad.top + ch)
      for (const p of points) ctx.lineTo(p.x, p.y)
      ctx.lineTo(points[points.length - 1].x, pad.top + ch)
      ctx.closePath()
      ctx.fillStyle = COLORS.fill
      ctx.fill()
    }

    // 数据点
    for (const p of points) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, DEFAULTS.dotRadius, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }
}

/**
 * 绘制柱状图（双系列对比）
 * 对应 HTML 中的 c2: 双轨预警对比
 */
function drawBarChart(canvas, ctx, data, opts = {}) {
  const dpr = wx.getSystemInfoSync().pixelRatio
  const w = canvas.width / dpr
  const h = canvas.height / dpr
  const pad = opts.padding || DEFAULTS.padding
  const cw = w - pad.left - pad.right
  const ch = h - pad.top - pad.bottom

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(dpr, dpr)

  if (!data || !data.labels || data.labels.length === 0) {
    drawEmpty(ctx, w, h)
    return
  }

  const maxVal = Math.max(...data.series.flatMap(s => s.values)) * 1.15
  const barWidth = cw / data.labels.length * 0.3
  const gap = cw / data.labels.length / 5

  const colors = [COLORS.personal, COLORS.medical]
  const labels = ['个人阈值', '医学标准']

  // 网格 / Y轴
  ctx.strokeStyle = COLORS.grid
  ctx.lineWidth = 1
  const ySteps = 4
  for (let i = 0; i <= ySteps; i++) {
    const y = pad.top + (i / ySteps) * ch
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(pad.left + cw, y)
    ctx.stroke()
    ctx.fillStyle = COLORS.muted
    ctx.font = `${DEFAULTS.fontSize}px sans-serif`
    ctx.textAlign = 'right'
    const val = ((ySteps - i) / ySteps * maxVal).toFixed(0)
    ctx.fillText(val + '%', pad.left - 6, y + 4)
  }

  // 绘制柱
  for (let i = 0; i < data.labels.length; i++) {
    const baseX = pad.left + (i / data.labels.length) * cw + gap
    for (let si = 0; si < data.series.length; si++) {
      const val = data.series[si].values[i]
      const x = baseX + si * (barWidth + gap)
      const barH = (val / maxVal) * ch
      const y = pad.top + ch - barH

      ctx.fillStyle = colors[si]
      ctx.fillRect(x, y, barWidth, barH)
    }

    // X 轴标签
    ctx.fillStyle = COLORS.muted
    ctx.font = `${DEFAULTS.fontSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(data.labels[i], pad.left + (i / data.labels.length + 0.5 / data.labels.length) * cw, pad.top + ch + 16)
  }

  // 图例
  ctx.font = `${DEFAULTS.fontSize}px sans-serif`
  ctx.textAlign = 'left'
  for (let si = 0; si < labels.length; si++) {
    const lx = pad.left + si * 120 + 20
    ctx.fillStyle = colors[si]
    ctx.fillRect(lx, pad.top - 18, 12, 12)
    ctx.fillStyle = COLORS.text
    ctx.fillText(labels[si], lx + 18, pad.top - 7)
  }
}

/**
 * 绘制环形图 / 饼图
 * 对应 HTML 中的 c3: 各时段预警占比
 */
function drawDonutChart(canvas, ctx, data, opts = {}) {
  const dpr = wx.getSystemInfoSync().pixelRatio
  const w = canvas.width / dpr
  const h = canvas.height / dpr

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(dpr, dpr)

  if (!data || !data.labels || data.labels.length === 0) {
    drawEmpty(ctx, w, h)
    return
  }

  const cx = w / 2
  const cy = h / 2 - 10
  const outerR = Math.min(w, h) / 2 * 0.6
  const innerR = outerR * 0.55

  const colors = ['#c49a3c', '#4a7c7c', '#c44a4a', '#3d8a6a', '#b0882e', '#6b6864', '#edebe6']
  const total = data.values.reduce((a, b) => a + b, 0)

  let startAngle = -Math.PI / 2
  for (let i = 0; i < data.labels.length; i++) {
    const sliceAngle = (data.values[i] / total) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx + innerR * Math.cos(startAngle), cy + innerR * Math.sin(startAngle))
    ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle)
    ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true)
    ctx.closePath()
    ctx.fillStyle = colors[i % colors.length]
    ctx.fill()

    startAngle += sliceAngle
  }

  // 中心文字
  ctx.fillStyle = COLORS.text
  ctx.font = 'bold 24px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(total, cx, cy - 8)
  ctx.font = '10px sans-serif'
  ctx.fillStyle = COLORS.muted
  ctx.fillText('总计', cx, cy + 14)
  ctx.textBaseline = 'alphabetic'
}

/**
 * 绘制组合图（折线 + 柱状）
 * 对应 HTML 中的 c4: 注射剂量 vs 空腹血糖
 */
function drawComboChart(canvas, ctx, data, opts = {}) {
  const dpr = wx.getSystemInfoSync().pixelRatio
  const w = canvas.width / dpr
  const h = canvas.height / dpr
  const pad = opts.padding || DEFAULTS.padding
  const cw = w - pad.left - pad.right
  const ch = h - pad.top - pad.bottom

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(dpr, dpr)

  if (!data || !data.labels || data.labels.length === 0) {
    drawEmpty(ctx, w, h)
    return
  }

  const maxVal = Math.max(...data.series.flatMap(s => s.values)) * 1.2
  const yMin = 0

  const toX = (i) => pad.left + (i / (data.labels.length - 1 || 1)) * cw
  const toY = (v) => pad.top + ch - ((v - yMin) / (maxVal - yMin)) * ch

  // 网格
  ctx.strokeStyle = COLORS.grid
  ctx.lineWidth = 1
  const ySteps = 4
  for (let i = 0; i <= ySteps; i++) {
    const y = pad.top + (i / ySteps) * ch
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(pad.left + cw, y)
    ctx.stroke()
    ctx.fillStyle = COLORS.muted
    ctx.font = `${DEFAULTS.fontSize}px sans-serif`
    ctx.textAlign = 'right'
    ctx.fillText((maxVal - (i / ySteps) * maxVal).toFixed(1), pad.left - 6, y + 4)
  }

  // 柱状图（剂量）
  const barWidth = cw / data.labels.length * 0.35
  for (let i = 0; i < data.labels.length; i++) {
    const val = data.series[1].values[i]
    const x = toX(i) - barWidth / 2
    const barH = (val / maxVal) * ch
    ctx.fillStyle = COLORS.tealLight
    ctx.fillRect(x, pad.top + ch - barH, barWidth, barH)
  }

  // 折线（血糖值）
  ctx.strokeStyle = COLORS.gold
  ctx.lineWidth = DEFAULTS.lineWidth
  const points = data.series[0].values.map((v, i) => ({ x: toX(i), y: toY(v) }))
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.stroke()

  for (const p of points) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, DEFAULTS.dotRadius, 0, Math.PI * 2)
    ctx.fillStyle = COLORS.gold
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  // X 轴标签
  ctx.fillStyle = COLORS.muted
  ctx.font = `${DEFAULTS.fontSize}px sans-serif`
  ctx.textAlign = 'center'
  for (let i = 0; i < data.labels.length; i++) {
    ctx.fillText(data.labels[i], toX(i), pad.top + ch + 16)
  }

  // 图例
  ctx.textAlign = 'left'
  ctx.fillStyle = COLORS.gold
  ctx.fillRect(pad.left, pad.top - 18, 12, 12)
  ctx.fillStyle = COLORS.text
  ctx.fillText(data.series[0].name || '血糖', pad.left + 18, pad.top - 7)
  ctx.fillStyle = COLORS.tealLight
  ctx.fillRect(pad.left + 120, pad.top - 18, 12, 12)
  ctx.fillStyle = COLORS.text
  ctx.fillText(data.series[1].name || '剂量', pad.left + 138, pad.top - 7)
}

/**
 * 绘制箱线/分布图
 * 对应 HTML 中的 c5: 各时段血糖分布
 */
function drawDistributionChart(canvas, ctx, data, opts = {}) {
  const dpr = wx.getSystemInfoSync().pixelRatio
  const w = canvas.width / dpr
  const h = canvas.height / dpr
  const pad = opts.padding || { top: 30, right: 20, bottom: 50, left: 50 }
  const cw = w - pad.left - pad.right
  const ch = h - pad.top - pad.bottom

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(dpr, dpr)

  if (!data || !data.labels || data.labels.length === 0) {
    drawEmpty(ctx, w, h)
    return
  }

  const maxVal = Math.max(...data.series.flatMap(s => s.values)) * 1.2
  const minVal = 0

  // 网格
  ctx.strokeStyle = COLORS.grid
  ctx.lineWidth = 1
  const ySteps = 5
  for (let i = 0; i <= ySteps; i++) {
    const y = pad.top + (i / ySteps) * ch
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(pad.left + cw, y)
    ctx.stroke()
    ctx.fillStyle = COLORS.muted
    ctx.font = `${DEFAULTS.fontSize}px sans-serif`
    ctx.textAlign = 'right'
    const val = maxVal - (i / ySteps) * maxVal
    ctx.fillText(val.toFixed(1), pad.left - 6, y + 4)
  }

  // 绘制小提琴/分布区域
  const colors = ['rgba(196,154,60,0.2)', 'rgba(74,124,124,0.2)', 'rgba(196,74,74,0.2)',
    'rgba(61,138,106,0.2)', 'rgba(176,136,46,0.2)', 'rgba(107,104,100,0.2)', 'rgba(237,235,230,0.2)']
  const borderColors = ['#c49a3c', '#4a7c7c', '#c44a4a', '#3d8a6a', '#b0882e', '#6b6864', '#edebe6']

  const barW = cw / data.labels.length * 0.5

  for (let i = 0; i < data.labels.length; i++) {
    const vals = data.series[i] ? data.series[i].values : []
    if (vals.length === 0) continue

    const cx = pad.left + (i / data.labels.length + 0.5 / data.labels.length) * cw

    // 箱体
    const sorted = [...vals].sort((a, b) => a - b)
    const q1 = sorted[Math.floor(sorted.length * 0.25)]
    const q3 = sorted[Math.floor(sorted.length * 0.75)]
    const median = sorted[Math.floor(sorted.length * 0.5)]
    const min = sorted[0]
    const max = sorted[sorted.length - 1]

    const toY = (v) => pad.top + ch - ((v - minVal) / (maxVal - minVal)) * ch

    // 上下须
    ctx.strokeStyle = borderColors[i % borderColors.length]
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx, toY(min))
    ctx.lineTo(cx, toY(max))
    ctx.stroke()

    // 须线
    const wiskW = barW * 0.5
    ctx.beginPath()
    ctx.moveTo(cx - wiskW, toY(min))
    ctx.lineTo(cx + wiskW, toY(min))
    ctx.moveTo(cx - wiskW, toY(max))
    ctx.lineTo(cx + wiskW, toY(max))
    ctx.stroke()

    // 箱体
    ctx.fillStyle = colors[i % colors.length]
    ctx.fillRect(cx - barW / 2, toY(q3), barW, toY(q1) - toY(q3))
    ctx.strokeStyle = borderColors[i % borderColors.length]
    ctx.lineWidth = 1.5
    ctx.strokeRect(cx - barW / 2, toY(q3), barW, toY(q1) - toY(q3))

    // 中位数线
    ctx.beginPath()
    ctx.moveTo(cx - barW / 2, toY(median))
    ctx.lineTo(cx + barW / 2, toY(median))
    ctx.strokeStyle = COLORS.text
    ctx.lineWidth = 2
    ctx.stroke()

    // X 标签
    ctx.fillStyle = COLORS.muted
    ctx.font = `${DEFAULTS.fontSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(data.labels[i], cx, pad.top + ch + 16)
  }
}

/**
 * 绘制极值散点图
 * 对应 HTML 中的 c6: 极值记录
 */
function drawScatterChart(canvas, ctx, data, opts = {}) {
  const dpr = wx.getSystemInfoSync().pixelRatio
  const w = canvas.width / dpr
  const h = canvas.height / dpr
  const pad = opts.padding || DEFAULTS.padding
  const cw = w - pad.left - pad.right
  const ch = h - pad.top - pad.bottom

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(dpr, dpr)

  if (!data || !data.points || data.points.length === 0) {
    drawEmpty(ctx, w, h)
    return
  }

  let maxVal = 0
  for (const p of data.points) {
    if (p.value > maxVal) maxVal = p.value
  }
  maxVal = Math.ceil(maxVal * 1.2)
  const minVal = 0

  const toX = (_) => pad.left + Math.random() * cw * 0.6 + cw * 0.2
  const toY = (v) => pad.top + ch - ((v - minVal) / (maxVal - minVal)) * ch

  // 网格
  ctx.strokeStyle = COLORS.grid
  ctx.lineWidth = 1
  const ySteps = 5
  for (let i = 0; i <= ySteps; i++) {
    const y = pad.top + (i / ySteps) * ch
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(pad.left + cw, y)
    ctx.stroke()
    ctx.fillStyle = COLORS.muted
    ctx.font = `${DEFAULTS.fontSize}px sans-serif`
    ctx.textAlign = 'right'
    ctx.fillText((maxVal - (i / ySteps) * maxVal).toFixed(1), pad.left - 6, y + 4)
  }

  // 散点
  for (let i = 0; i < data.points.length; i++) {
    const p = data.points[i]
    const x = pad.left + (i / (data.points.length + 1)) * cw + cw * 0.08
    const y = toY(p.value)

    const color = p.type === 'high' ? COLORS.red : COLORS.amber
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()

    // 标签
    ctx.fillStyle = COLORS.text
    ctx.font = '9px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(p.label || `${p.value}`, x, y - 12)
  }

  // 阈值线
  const threshold = 6.1
  const ty = toY(threshold)
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = COLORS.red
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad.left, ty)
  ctx.lineTo(pad.left + cw, ty)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = COLORS.red
  ctx.font = '9px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('阈值 6.1', pad.left + 4, ty - 4)
}

/**
 * 绘制空状态
 */
function drawEmpty(ctx, w, h) {
  ctx.fillStyle = COLORS.muted
  ctx.font = '13px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('暂无数据', w / 2, h / 2)
  ctx.textBaseline = 'alphabetic'
}

module.exports = {
  drawLineChart,
  drawBarChart,
  drawDonutChart,
  drawComboChart,
  drawDistributionChart,
  drawScatterChart
}
