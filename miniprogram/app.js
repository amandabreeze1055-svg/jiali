App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    try {
      wx.cloud.init({
        env: 'cloud1-9gdmb9nmfa3f1652',
        traceUser: true
      })
    } catch (err) {
      console.warn('云开发初始化失败：', err)
    }
  }
})
