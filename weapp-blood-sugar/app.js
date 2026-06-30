/**
 * 血糖数据监测系统 - 小程序入口
 * ===============================================
 * 作品集演示版 · 数据运营看板
 * 视觉设计源自 blood_sugar_dashboard.html
 * 暖色编辑风 · 数据新闻质感
 * ===============================================
 * 合规声明：本应用为个人作品集演示，不涉及真实患者诊疗数据
 */

App({
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    loginMode: '',       // 'wechat' | 'phone'
    openId: '',
    dbRecords: [],       // 云端血糖记录缓存
    dbInjections: {},    // 云端注射记录缓存
    // ---- 作品集演示数据 ----
    demoRecords: [],
    demoInjections: {},
    useCloud: false,     // 是否启用云数据库（演示模式默认为false）
    lastSyncTime: ''
  },

  onLaunch() {
    // 检查登录状态
    const token = wx.getStorageSync('token')
    if (token) {
      this.globalData.isLoggedIn = true
    }
    // 云开发环境改为惰性初始化（启动时不调用，避免占位符 env ID 导致超时）
    // 首次需要云能力时由 cloud.js 中的 ensureCloudInit 触发
  },

  /**
   * 惰性初始化云开发环境
   * 仅在用户配置了有效环境ID后才调用
   * @returns {boolean} 是否初始化成功
   */
  ensureCloudInit() {
    if (this.globalData._cloudInited) return this.globalData.useCloud
    const env = wx.getStorageSync('cloudEnv')
    if (!env || env === 'your-env-id-xxx' || env === '') {
      console.warn('[作品集演示] 云环境未配置，使用本地演示数据模式')
      this.globalData.useCloud = false
      this.globalData._cloudInited = true
      return false
    }
    try {
      wx.cloud.init({ env, traceUser: true })
      this.globalData.useCloud = true
      this.globalData._cloudInited = true
      return true
    } catch (e) {
      console.warn('[云开发] 初始化失败', e)
      this.globalData.useCloud = false
      this.globalData._cloudInited = true
      return false
    }
  },

  // 设置全局用户信息
  setUserInfo(userInfo, openId, mode) {
    this.globalData.userInfo = userInfo
    this.globalData.openId = openId
    this.globalData.loginMode = mode
    this.globalData.isLoggedIn = true
    wx.setStorageSync('token', openId)
  },

  // 获取当前登录用户信息
  getUserInfo() {
    return this.globalData.userInfo
  },

  // 退出登录
  logout() {
    this.globalData.userInfo = null
    this.globalData.isLoggedIn = false
    this.globalData.openId = ''
    wx.removeStorageSync('token')
    wx.removeStorageSync('phoneNumber')
  }
})
