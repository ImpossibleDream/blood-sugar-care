/**
 * 指标计算工具
 * ===============================================
 * 计算 KPI、趋势、统计指标
 * 作品集演示版
 * ===============================================
 */

const { SLOT_NAMES, getThreshold, getStatus } = require('./util')

/**
 * 从原始记录计算月度趋势
 * @param {Array} records - [{date, slotIdx, value}]
 * @returns {Object} - { slotTrend: {0: {month: avg, ...}, ...}, overall: {...} }
 */
function calcTrends(records) {
  if (!records || records.length === 0) return { slotTrend: {}, monthLabels: [] }

  // 按月份+时段分组
  const groups = {}
  const monthSet = new Set()
  for (const r of records) {
    const m = r.date.substring(0, 7)
    monthSet.add(m)
    const key = m + '-' + r.slotIdx
    if (!groups[key]) groups[key] = []
    groups[key].push(r.value)
  }
  const monthLabels = Array.from(monthSet).sort()

  const slotTrend = {}
  for (let si = 0; si < 7; si++) {
    const data = {}
    for (const m of monthLabels) {
      const key = m + '-' + si
      if (groups[key] && groups[key].length > 0) {
        const sum = groups[key].reduce((a, b) => a + b, 0)
        data[m] = +(sum / groups[key].length).toFixed(2)
      }
    }
    if (Object.keys(data).length > 0) slotTrend[si] = data
  }

  return { slotTrend, monthLabels }
}

/**
 * 计算各时段统计
 * @param {Array} records
 * @returns {Array} - 每时段统计 [{ total, avg, personal: {normal, low, high}, medical: {...} }]
 */
function calcSlotStats(records) {
  if (!records || records.length === 0) return []
  const slots = {}
  for (let i = 0; i < 7; i++) slots[i] = []
  for (const r of records) {
    if (r.slotIdx >= 0 && r.slotIdx < 7) {
      slots[r.slotIdx].push(r.value)
    }
  }
  const stats = []
  for (let si = 0; si < 7; si++) {
    const vals = slots[si]
    if (vals.length === 0) {
      stats.push({ total: 0, avg: 0, personal: { normal: 0, low: 0, high: 0, normal_pct: 0, low_pct: 0, high_pct: 0 }, medical: { normal: 0, low: 0, high: 0, normal_pct: 0, low_pct: 0, high_pct: 0 } })
      continue
    }
    const sum = vals.reduce((a, b) => a + b, 0)
    const avg = +(sum / vals.length).toFixed(2)
    let pNorm = 0, pLow = 0, pHigh = 0
    let mNorm = 0, mLow = 0, mHigh = 0
    const util = require('./util')
    for (const v of vals) {
      const st = getStatus(v, si)
      if (st === 'normal') pNorm++
      else if (st === 'low') pLow++
      else pHigh++
      // 医学标准
      const mt = util.getMedicalThreshold(si)
      if (v >= mt.low && v <= mt.high) mNorm++
      else if (v < mt.low) mLow++
      else mHigh++
    }
    const total = vals.length
    stats.push({
      total,
      avg,
      personal: {
        normal: pNorm, low: pLow, high: pHigh,
        normal_pct: +((pNorm / total) * 100).toFixed(1),
        low_pct: +((pLow / total) * 100).toFixed(1),
        high_pct: +((pHigh / total) * 100).toFixed(1)
      },
      medical: {
        normal: mNorm, low: mLow, high: mHigh,
        normal_pct: +((mNorm / total) * 100).toFixed(1),
        low_pct: +((mLow / total) * 100).toFixed(1),
        high_pct: +((mHigh / total) * 100).toFixed(1)
      }
    })
  }
  return stats
}

/**
 * 计算概览 KPI
 * @param {Array} records
 * @returns {Object}
 */
function calcOverviewKPI(records) {
  if (!records || records.length === 0) {
    return { totalPoints: 0, uniqueDates: 0, overallMean: 0, overallMedian: 0, dateMin: '', dateMax: '' }
  }
  const vals = records.map(r => r.value)
  vals.sort((a, b) => a - b)
  const n = vals.length
  const sum = vals.reduce((a, b) => a + b, 0)
  const mean = +(sum / n).toFixed(2)
  const median = n % 2 === 0
    ? +((vals[n / 2 - 1] + vals[n / 2]) / 2).toFixed(2)
    : vals[Math.floor(n / 2)]

  const dates = new Set(records.map(r => r.date))
  const uniqueDates = dates.size
  const sortedDates = Array.from(dates).sort()

  return {
    totalPoints: n,
    uniqueDates,
    overallMean: mean,
    overallMedian: median,
    dateMin: sortedDates[0] || '',
    dateMax: sortedDates[sortedDates.length - 1] || ''
  }
}

/**
 * 获取注射记录统计
 */
function calcInjectionStats(injections) {
  if (!injections) return { count: 0, currentDose: 0, stableDays: 0 }
  const dates = Object.keys(injections).sort()
  const count = dates.length
  const currentDose = dates.length > 0 ? injections[dates[dates.length - 1]] : 0
  // 计算当前剂量稳定天数
  let stableDays = 0
  for (let i = dates.length - 1; i >= 0; i--) {
    if (injections[dates[i]] === currentDose) stableDays++
    else break
  }
  return { count, currentDose, stableDays }
}

module.exports = {
  calcTrends,
  calcSlotStats,
  calcOverviewKPI,
  calcInjectionStats
}
