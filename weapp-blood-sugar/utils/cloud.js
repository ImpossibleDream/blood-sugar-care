/**
 * 云数据库操作封装
 * ===============================================
 * 提供记录和注射数据的 CRUD 操作
 * 同时支持云数据库和本地缓存两种模式（演示模式）
 * ===============================================
 * 作品集演示标注：
 * - 云开发需在微信开发者工具中开通「云开发」并创建环境
 * - 演示模式下数据存储在本地缓存，无需云环境
 * ===============================================
 */

const { SLOT_NAMES, genId } = require('./util')

/** 数据集合名称 */
const COLLECTIONS = {
  records: 'blood_sugar_records',
  injections: 'blood_sugar_injections',
  users: 'blood_sugar_users'
}

/**
 * 初始化云数据库（写入演示数据到云端）
 */
async function initCloudDB(demoRecords, demoInjections) {
  const db = wx.cloud.database()
  const _ = db.command

  try {
    // 检查是否有数据
    const countRes = await db.collection(COLLECTIONS.records).count()
    if (countRes.total > 0) return  // 已有数据则跳过

    // 批量写入演示记录（每次最多 20 条）
    const batchSize = 20
    for (let i = 0; i < demoRecords.length; i += batchSize) {
      const batch = demoRecords.slice(i, i + batchSize)
      const tasks = batch.map(r =>
        db.collection(COLLECTIONS.records).add({
          data: { date: r[0], slotIdx: r[1], value: r[2], createdAt: db.serverDate() }
        })
      )
      await Promise.all(tasks)
    }

    // 写入注射记录
    for (const [date, dose] of Object.entries(demoInjections)) {
      await db.collection(COLLECTIONS.injections).add({
        data: { date, dose, createdAt: db.serverDate() }
      })
    }

    console.log('[云数据库] 演示数据初始化完成')
  } catch (e) {
    console.warn('[云数据库] 初始化失败，使用本地模式', e)
    throw e
  }
}

/**
 * 查询所有血糖记录
 * @param {Object} filters - { dateFrom, dateTo, slotIdx }
 * @returns {Promise<Array>}
 */
async function fetchRecords(filters = {}) {
  const db = wx.cloud.database()
  const _ = db.command
  let query = {}
  if (filters.dateFrom) {
    query.date = _.gte(filters.dateFrom)
  }
  if (filters.dateTo) {
    query.date = query.date ? _.and(_.lte(filters.dateTo)) : _.lte(filters.dateTo)
  }
  if (filters.slotIdx >= 0) {
    query.slotIdx = filters.slotIdx
  }

  try {
    const res = await db.collection(COLLECTIONS.records)
      .where(query)
      .orderBy('date', 'desc')
      .get()
    return res.data.map(d => ({
      _id: d._id,
      date: d.date,
      slotIdx: d.slotIdx,
      value: d.value
    }))
  } catch (e) {
    console.warn('[云数据库] 查询记录失败', e)
    return []
  }
}

/**
 * 获取所有注射记录
 * @returns {Promise<Object>} - { date: dose }
 */
async function fetchInjections() {
  const db = wx.cloud.database()
  try {
    const res = await db.collection(COLLECTIONS.injections).get()
    const inj = {}
    for (const d of res.data) {
      inj[d.date] = d.dose
    }
    return inj
  } catch (e) {
    console.warn('[云数据库] 查询注射记录失败', e)
    return {}
  }
}

/**
 * 添加血糖记录
 * @param {string} date
 * @param {number} slotIdx
 * @param {number} value
 * @returns {Promise<string>} 记录ID
 */
async function addRecord(date, slotIdx, value) {
  const db = wx.cloud.database()
  try {
    const res = await db.collection(COLLECTIONS.records).add({
      data: {
        date,
        slotIdx,
        value,
        createdAt: db.serverDate()
      }
    })
    return res._id
  } catch (e) {
    console.error('[云数据库] 添加记录失败', e)
    throw e
  }
}

/**
 * 更新血糖记录
 * @param {string} id
 * @param {object} data - { date, slotIdx, value }
 */
async function updateRecord(id, data) {
  const db = wx.cloud.database()
  try {
    await db.collection(COLLECTIONS.records).doc(id).update({
      data: {
        ...data,
        updatedAt: db.serverDate()
      }
    })
  } catch (e) {
    console.error('[云数据库] 更新记录失败', e)
    throw e
  }
}

/**
 * 删除血糖记录
 * @param {string} id
 */
async function deleteRecord(id) {
  const db = wx.cloud.database()
  try {
    await db.collection(COLLECTIONS.records).doc(id).remove()
  } catch (e) {
    console.error('[云数据库] 删除记录失败', e)
    throw e
  }
}

/**
 * 添加/更新注射记录
 * @param {string} date
 * @param {number} dose
 */
async function upsertInjection(date, dose) {
  const db = wx.cloud.database()
  try {
    // 先查找是否存在该日期的记录
    const res = await db.collection(COLLECTIONS.injections)
      .where({ date })
      .get()
    if (res.data.length > 0) {
      await db.collection(COLLECTIONS.injections).doc(res.data[0]._id).update({
        data: { dose, updatedAt: db.serverDate() }
      })
    } else {
      await db.collection(COLLECTIONS.injections).add({
        data: { date, dose, createdAt: db.serverDate() }
      })
    }
  } catch (e) {
    console.error('[云数据库] 更新注射记录失败', e)
    throw e
  }
}

/**
 * 删除注射记录
 * @param {string} date
 */
async function deleteInjection(date) {
  const db = wx.cloud.database()
  try {
    const res = await db.collection(COLLECTIONS.injections)
      .where({ date })
      .get()
    if (res.data.length > 0) {
      await db.collection(COLLECTIONS.injections).doc(res.data[0]._id).remove()
    }
  } catch (e) {
    console.error('[云数据库] 删除注射记录失败', e)
    throw e
  }
}

/**
 * 记录用户登录日志
 * @param {Object} userInfo
 * @param {string} loginMode
 */
async function logUserLogin(userInfo, loginMode) {
  const db = wx.cloud.database()
  try {
    await db.collection(COLLECTIONS.users).add({
      data: {
        openId: userInfo.openId || '',
        nickName: userInfo.nickName || '',
        loginMode,
        loginTime: db.serverDate()
      }
    })
  } catch (e) {
    console.warn('[云数据库] 登录日志写入失败', e)
  }
}

module.exports = {
  COLLECTIONS,
  initCloudDB,
  fetchRecords,
  fetchInjections,
  addRecord,
  updateRecord,
  deleteRecord,
  upsertInjection,
  deleteInjection,
  logUserLogin
}
