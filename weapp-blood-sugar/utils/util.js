/**
 * 工具函数集
 * ===============================================
 * 作品集演示 · 血糖数据监测系统
 * ===============================================
 */

/** 时段名称映射 */
const SLOT_NAMES = ['空腹', '早餐后2小时', '午餐前', '午餐后2小时', '晚餐前', '晚餐后2小时', '3:00', '注射剂量']

/** 时段名称（不含注射） */
const SLOT_NAMES_SHORT = ['空腹', '早餐后2h', '午餐前', '午餐后2h', '晚餐前', '晚餐后2h', '3:00']

/** 个人预警阈值 */
const THRESHOLD = {
  fasting: { low: 3.9, high: 6.1 },
  postMeal: { low: 3.9, high: 7.8 }
}

/** 医学标准阈值 */
const MEDICAL_THRESHOLD = {
  fasting: { low: 4.4, high: 7.0 },
  postMeal: { low: 3.9, high: 10.0 }
}

/** 格式化日期为 YYYY-MM-DD */
function formatDate(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 获取今天的日期字符串 */
function today() {
  return formatDate(new Date())
}

/** 判断是否为空腹时段（slot 0, 2, 4, 6） */
function isFastingSlot(slotIdx) {
  return slotIdx === 0 || slotIdx === 2 || slotIdx === 4 || slotIdx === 6
}

/** 获取阈值（自动判断空腹/餐后） */
function getThreshold(slotIdx) {
  if (slotIdx === 0 || slotIdx === 6) return THRESHOLD.fasting
  return THRESHOLD.postMeal
}

/** 获取医学阈值 */
function getMedicalThreshold(slotIdx) {
  if (slotIdx === 0 || slotIdx === 6) return MEDICAL_THRESHOLD.fasting
  return MEDICAL_THRESHOLD.postMeal
}

/** 判断血糖值状态：'high' | 'low' | 'normal' */
function getStatus(value, slotIdx) {
  const t = getThreshold(slotIdx)
  if (value > t.high) return 'high'
  if (value < t.low) return 'low'
  return 'normal'
}

/** 获取月份标签数组 */
function getMonthLabels(records) {
  const months = new Set()
  for (const r of records) {
    months.add(r.date.substring(0, 7))
  }
  return Array.from(months).sort()
}

/** 深拷贝 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

/** 生成唯一ID */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6)
}

module.exports = {
  SLOT_NAMES,
  SLOT_NAMES_SHORT,
  THRESHOLD,
  MEDICAL_THRESHOLD,
  formatDate,
  today,
  isFastingSlot,
  getThreshold,
  getMedicalThreshold,
  getStatus,
  getMonthLabels,
  deepClone,
  genId
}
