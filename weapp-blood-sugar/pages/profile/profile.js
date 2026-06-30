/**
 * "我的"页面
 * 作品集演示 · 血糖数据监测系统
 */
const app = getApp()
Page({
  data: {
    avatar: '',
    nickName: '',
    loginModeLabel: '',
    cloudMode: false,
    recordCount: 0
  },
  onShow() {
    var sys = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: sys.statusBarHeight })
    const info = app.globalData.userInfo || {}
    const mode = app.globalData.loginMode
    const modeLabel = mode === 'wechat' ? '微信授权' : mode === 'phone' ? '手机验证码' : '未登录'
    const records = app.globalData.demoRecords || []
    this.setData({
      avatar: info.avatarUrl || '',
      nickName: info.nickName || '微信用户',
      loginModeLabel: modeLabel,
      cloudMode: app.globalData.useCloud,
      recordCount: records.length
    })
  },
  onLogout() {
    wx.showModal({
      title: '退出确认',
      content: '退出后将返回登录页面，本地数据不会丢失。确定退出？',
      success(res) {
        if (res.confirm) {
          app.logout()
          wx.redirectTo({ url: '/pages/login/login' })
        }
      }
    })
  },
  onTabChange(e) {
    const idx = e.detail.index
    if (idx === 3 || idx === this.data.tabIdx) return
    const pages = ['/pages/records/records', '/pages/dashboard/dashboard', '/pages/report/report', '/pages/profile/profile']
    if (idx >= 0 && idx < 4) {
      wx.redirectTo({ url: pages[idx] })
    }
  }
})
