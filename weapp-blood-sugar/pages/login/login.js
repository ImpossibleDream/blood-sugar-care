/**
 * 登录页面 - 双模式登录
 * ===============================================
 * 作品集演示版 · 血糖数据监测系统
 * 模式1：微信授权登录（getUserInfo / 云函数获取 OpenID）
 * 模式2：手机验证码登录（带倒计时、模拟验证）
 * ===============================================
 */
const app = getApp()

Page({
  data: {
    loginMode: 'wechat',
    phoneNumber: '',
    code: '',
    codeSending: false,
    codeBtnText: '获取验证码',
    codeCountdown: 0,
    userAvatar: '',
    userNick: '',
    logging: false
  },

  onLoad() {
    // 检查是否已登录
    if (app.globalData.isLoggedIn) {
      this.navigateToHome()
      return
    }
    // 读取缓存的手机号
    const savedPhone = wx.getStorageSync('phoneNumber')
    if (savedPhone) {
      this.setData({ phoneNumber: savedPhone })
    }
  },

  /** 切换登录模式 */
  switchMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({ loginMode: mode })
  },

  /** 微信授权登录 */
  onWechatLogin(e) {
    if (this.data.logging) return
    this.setData({ logging: true })

    const that = this
    const detail = e.detail

    if (detail && detail.userInfo) {
      // 方式1: 获取到用户信息
      const userInfo = detail.userInfo
      that.setData({
        userAvatar: userInfo.avatarUrl,
        userNick: userInfo.nickName
      })

      // 调用云函数获取 OpenID
      if (app.ensureCloudInit()) {
        wx.cloud.callFunction({
          name: 'login',
          data: { action: 'wechatLogin' },
          success(res) {
            const openId = res.result.data.openid || ''
            app.setUserInfo(userInfo, openId, 'wechat')
            that.navigateToHome()
          },
          fail() {
            // 降级：本地模式继续
            app.setUserInfo(userInfo, 'demo_' + Date.now(), 'wechat')
            that.navigateToHome()
          },
          complete() {
            that.setData({ logging: false })
          }
        })
      } else {
        app.setUserInfo(userInfo, 'demo_' + Date.now(), 'wechat')
        that.navigateToHome()
        that.setData({ logging: false })
      }
    } else {
      // 方式2: 未获取到用户信息，用 wx.login 降级
      wx.login({
        success(res) {
          if (res.code) {
            app.setUserInfo({
              nickName: '微信用户',
              avatarUrl: ''
            }, 'demo_' + Date.now(), 'wechat')
            that.navigateToHome()
          }
        },
        fail() {
          wx.showToast({ title: '登录失败', icon: 'none' })
        },
        complete() {
          that.setData({ logging: false })
        }
      })
    }
  },

  /** 手机号输入 */
  onPhoneInput(e) {
    this.setData({ phoneNumber: e.detail.value })
  },

  /** 验证码输入 */
  onCodeInput(e) {
    this.setData({ code: e.detail.value })
  },

  /** 发送验证码 */
  sendCode() {
    const phone = this.data.phoneNumber
    if (!phone || phone.length !== 11) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' })
      return
    }
    if (this.data.codeSending) return

    this.setData({ codeSending: true, codeCountdown: 60 })
    this.updateCodeBtn()

    // 模拟发送验证码（实际部署需对接短信服务商）
    wx.showToast({ title: '验证码已发送（演示）', icon: 'none' })

    // 倒计时
    const timer = setInterval(() => {
      let count = this.data.codeCountdown - 1
      if (count <= 0) {
        clearInterval(timer)
        this.setData({
          codeSending: false,
          codeBtnText: '重新获取',
          codeCountdown: 0
        })
      } else {
        this.setData({ codeCountdown: count })
        this.updateCodeBtn()
      }
    }, 1000)
  },

  /** 更新验证码按钮文字 */
  updateCodeBtn() {
    const count = this.data.codeCountdown
    this.setData({
      codeBtnText: count > 0 ? count + 's' : '获取验证码'
    })
  },

  /** 手机验证码登录 */
  onPhoneLogin() {
    const phone = this.data.phoneNumber
    const code = this.data.code
    if (!phone || phone.length !== 11) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' })
      return
    }
    if (!code || code.length < 4) {
      wx.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }

    this.setData({ logging: true })

    // 模拟验证（实际部署需验证验证码）
    wx.showLoading({ title: '验证中...' })

    setTimeout(() => {
      wx.hideLoading()
      wx.setStorageSync('phoneNumber', phone)

      app.setUserInfo({
        nickName: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
        avatarUrl: ''
      }, 'phone_' + phone, 'phone')

      this.navigateToHome()
    }, 1200)
  },

  /** 登录成功跳转主页 */
  navigateToHome() {
    // 初始化演示数据：使用完整的 1138 条数据集
    if (!app.globalData.demoRecords || app.globalData.demoRecords.length === 0) {
      var demoData = require('../../utils/demoData')
      var demoRecords = demoData.records.map(function(r) { return { date: r[0], slotIdx: r[1], value: r[2] } })
      var demoInjections = demoData.injections
      app.globalData.demoRecords = demoRecords
      app.globalData.demoInjections = demoInjections
    }

    wx.redirectTo({ url: '/pages/records/records' })
  },

  /** 获取演示数据（与 HTML 文件数据一致） */
  getDemoRecords() {
    // 返回原始演示数据格式 [date, slotIdx, value]
    const RAW = [["2025-12-17",4,14.1],["2025-12-17",5,13.5],["2025-12-17",6,6.2],["2025-12-18",0,8.6],["2025-12-18",1,10.8],["2025-12-18",2,6.1],["2025-12-18",3,11.7],["2025-12-18",4,5.9],["2025-12-18",5,10.0],["2025-12-18",6,4.8]]
    return RAW.map(r => ({ date: r[0], slotIdx: r[1], value: r[2] }))
  },

  getDemoInjections() {
    return { "2025-12-23": 0.6, "2025-12-24": 0.9, "2025-12-25": 0.6, "2026-01-06": 1.2, "2026-06-15": 1.1, "2026-06-16": 1.2 }
  }
})
