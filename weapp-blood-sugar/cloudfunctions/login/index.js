/**
 * 云登录函数
 * ===============================================
 * 作品集演示版 · 血糖数据监测系统
 * 功能：获取微信 OpenID、记录用户登录
 * 需在微信开发者工具中上传部署
 * ===============================================
 * 合规声明：本云函数仅用于个人作品集展示
 * ===============================================
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 微信登录（获取 OpenID）
 */
async function wechatLogin(event) {
  const { wxContext } = cloud.getWXContext()
  return {
    code: 0,
    data: {
      openid: wxContext.OPENID,
      unionid: wxContext.UNIONID || '',
      appid: wxContext.APPID
    },
    message: '登录成功'
  }
}

/**
 * 手机号登录（获取手机号）
 * 需在微信开发者工具中设置权限
 */
async function phoneLogin(event) {
  const { wxContext } = cloud.getWXContext()
  try {
    // phone 通过 getPhoneNumber 接口获取
    if (event.phoneData && event.phoneData.encryptedData) {
      const result = await cloud.getOpenData({
        list: [event.phoneData.cloudID]
      })
      const phoneNumber = result.list[0].data.phoneNumber || ''
      return {
        code: 0,
        data: {
          openid: wxContext.OPENID,
          phoneNumber,
          appid: wxContext.APPID
        },
        message: '登录成功'
      }
    }
    return {
      code: 1,
      data: { openid: wxContext.OPENID },
      message: '验证码验证成功（模拟模式）'
    }
  } catch (e) {
    return { code: -1, data: {}, message: '手机号获取失败: ' + e.message }
  }
}

/**
 * 登录入口
 */
exports.main = async (event) => {
  const { action } = event
  let result

  switch (action) {
    case 'wechatLogin':
      result = await wechatLogin(event)
      break
    case 'phoneLogin':
      result = await phoneLogin(event)
      break
    default:
      // 默认返回 OpenID
      const { wxContext } = cloud.getWXContext()
      result = {
        code: 0,
        data: { openid: wxContext.OPENID },
        message: '登录成功'
      }
  }

  // 记录登录日志
  try {
    await db.collection('blood_sugar_users').add({
      data: {
        openid: result.data.openid || '',
        action,
        loginTime: db.serverDate(),
        eventData: JSON.stringify(event)
      }
    })
  } catch (e) {
    // 日志写入失败不影响主流程
  }

  return result
}
