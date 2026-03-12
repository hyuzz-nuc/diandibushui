Component({
  data: {
    active: 2, // 默认选中首页 (index 2)
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
      console.log('[custom-tab-bar] setVisibility called with:', hide);
      console.log('[custom-tab-bar] 当前 hideTabbar:', this.data.hideTabbar);
      this.setData({ hideTabbar: hide });
      console.log('[custom-tab-bar] 设置后 hideTabbar:', hide);
    }
  }
});