/**
 * CSV 导出工具
 * ===============================================
 * 将血糖记录和注射记录导出为 CSV 格式
 * 作品集演示版
 * ===============================================
 */

const { SLOT_NAMES } = require('./util')

/**
 * 生成血糖数据 CSV
 * @param {Array} records - [{date, slotIdx, value}]
 * @param {Object} injections - {date: dose}
 * @returns {string} CSV 文本
 */
function generateCSV(records, injections) {
  const lines = ['日期,时段,数值,类型,备注']

  // 血糖记录
  for (const r of records) {
    const slotName = SLOT_NAMES[r.slotIdx] || '未知'
    const type = '血糖'
    let remark = ''
    if (r.slotIdx === 0 && r.value > 6.1) remark = '偏高（个人阈值）'
    else if (r.value > 7.8) remark = '偏高（个人阈值）'
    else if (r.value < 3.9) remark = '偏低（个人阈值）'
    else remark = '正常'
    lines.push(`${r.date},${slotName},${r.value.toFixed(1)},${type},${remark}`)
  }

  // 注射记录
  if (injections) {
    for (const [date, dose] of Object.entries(injections)) {
      lines.push(`${date},注射,${dose.toFixed(1)},注射剂量,mg`)
    }
  }

  return '\uFEFF' + lines.join('\n') + '\n'
}

/**
 * 导出为文本文件（小程序端调用）
 * @param {string} csvText
 * @param {string} filename
 */
function saveCSV(csvText, filename) {
  const fs = wx.getFileSystemManager()
  const filePath = `${wx.env.USER_DATA_PATH}/${filename}`
  try {
    fs.writeFileSync(filePath, csvText, 'utf-8')
    wx.openDocument({
      filePath,
      fileType: 'csv',
      success() {
        wx.showToast({ title: '导出成功', icon: 'success' })
      },
      fail(err) {
        // 降级：保存后提示
        wx.showModal({
          title: '导出完成',
          content: `文件已保存至：${filename}`,
          showCancel: false
        })
      }
    })
  } catch (e) {
    wx.showToast({ title: '导出失败', icon: 'none' })
  }
}

module.exports = { generateCSV, saveCSV }
