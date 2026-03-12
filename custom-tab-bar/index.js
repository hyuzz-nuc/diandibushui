Component({
  data: {
    active: 2 // 默认选中首页 (index 2)
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
    }
  }
});