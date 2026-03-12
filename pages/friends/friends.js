Page({
  data: {
    friends: [],
    loading: true
  },

  onShow() {
    this.loadFriends();
  },

  loadFriends() {
    this.setData({ loading: true });
    wx.cloud.callFunction({
      name: 'getFriendsList'
    }).then(res => {
      this.setData({
        friends: res.result.data || [],
        loading: false
      });
    }).catch(err => {
      console.error(err);
      this.setData({ loading: false });
    });
  },

  onRemind(e) {
    const friendId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    
    wx.showToast({
      title: `已提醒 ${name} 喝水`,
      icon: 'success'
    });
    // TODO: 调用发送订阅消息接口
  },

  onShareAppMessage() {
    const app = getApp();
    return {
      title: '来和我一起喝水打卡吧！',
      path: '/pages/index/index?inviteCode=' + (app.globalData.openid || '')
    }
  }
});
