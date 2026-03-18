Component({
  data: {
    active: 0, // 默认选中第一个 Tab
    hideTabbar: false // 是否隐藏导航栏
  },
  methods: {
    onChange(event) {
      this.setData({ active: event.detail });
      const urls = [
        '/pages/discovery/discovery',
        '/pages/social/social',
        '/pages/index/index',
        '/pages/stats/stats',
        '/pages/profile/profile'
      ];
      wx.switchTab({
        url: urls[event.detail]
      });
    },
    // 控制导航栏显示/隐藏
    setVisibility(hide) {
      this.setData({ hideTabbar: hide });
    }
  }
});
