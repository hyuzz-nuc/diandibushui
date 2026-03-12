Page({
  data: {
    articleTitle: '',
    articleHtml: '',
    articleTags: [],
    statusBarHeight: 0,
    navBarHeight: 44
  },

  onLoad(options) {
    // 获取系统信息以适配自定义导航栏
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight,
      navBarHeight: 44 // 标准导航栏高度
    });

    // 接收参数
    const eventChannel = this.getOpenerEventChannel();
    if (eventChannel && eventChannel.on) {
      eventChannel.on('acceptDataFromOpenerPage', (data) => {
        const { parse } = require('../../utils/markdown');
        this.setData({
          articleTitle: data.title,
          articleHtml: parse(data.content),
          articleTags: data.tags || []
        });
      });
    }
  },

  // 返回上一页
  onBack() {
    wx.navigateBack({
      delta: 1
    });
  },

  // 回到首页
  onHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
})