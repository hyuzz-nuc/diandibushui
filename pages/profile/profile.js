const app = getApp();

Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: '',
      current_title: '饮水萌新',
      consecutive_days: 0,
      total_days: 0,
      daily_goal: 2000
    },
    hasUserInfo: false,
    showInvitePopup: false
  },

  onShow() {
    this.loadUserInfo();
    
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        active: 4 // 我的页对应索引 4
      })
    }
  },

  loadUserInfo() {
    // 优先从全局数据获取
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      });
    } else {
      // 否则尝试从云端拉取（这里简化，复用 login 的逻辑或者单独查）
      // 由于 login 已经运行过，理论上 app.globalData 应该有数据，除非是新用户
      // 这里我们尝试再次调用 login 获取最新数据
      wx.cloud.callFunction({
        name: 'login'
      }).then(res => {
        if (res.result.userInfo) {
          app.globalData.userInfo = res.result.userInfo;
          this.setData({
            userInfo: res.result.userInfo,
            hasUserInfo: true
          });
        }
      });
    }
  },

  onPickAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera']
    }).then(res => {
      const tempFilePath = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath;
      if (!tempFilePath) return;
      this.uploadAvatar(tempFilePath);
    }).catch(() => {});
  },

  uploadAvatar(filePath) {
    wx.showLoading({ title: '上传头像中...' });
    const cloudPath = `avatars/${app.globalData.openid}_${Date.now()}.jpg`;
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: res => {
        this.setData({
          'userInfo.avatarUrl': res.fileID
        });
        wx.hideLoading();
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    });
  },

  onInputChange(e) {
    const nickName = e.detail.value;
    this.setData({
      'userInfo.nickName': nickName
    });
  },

  saveUserInfo() {
    if (!this.data.userInfo.nickName) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '保存中...' });
    
    wx.cloud.callFunction({
      name: 'updateUserInfo',
      data: {
        avatarUrl: this.data.userInfo.avatarUrl,
        nickName: this.data.userInfo.nickName
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result.success) {
        wx.showToast({ title: '保存成功' });
        // 更新全局数据
        app.globalData.userInfo = this.data.userInfo;
      } else {
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error(err);
      wx.showToast({ title: '网络错误', icon: 'none' });
    });
  },

  onInviteFriend() {
    this.setData({ showInvitePopup: true });
  },

  onCloseInvite() {
    this.setData({ showInvitePopup: false });
  },

  onViewPoster() {
    const { consecutive_days, daily_goal, current_title } = this.data.userInfo;
    // 构造跳转参数
    const days = Number(consecutive_days) || 0;
    const goal = Number(daily_goal) || 2000;
    const title = current_title ? encodeURIComponent(current_title) : '';
    
    wx.navigateTo({
      url: `/pages/celebrate/celebrate?days=${days}&goal=${goal}&title=${title}`
    });
  },

  restartGuide() {
    wx.showModal({
      title: '重新进入新手引导',
      content: '引导过程中的数据不会影响到您的实际记录，确认要重新开始吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除引导缓存
          wx.removeStorageSync('has_guided_v2');
          // 跳转到首页，由首页检测引导状态并启动引导
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      }
    });
  },

  onShareAppMessage() {
    return {
      title: '快来和我一起喝水打卡吧！',
      path: '/pages/index/index?inviteCode=' + (app.globalData.openid || '')
    }
  }
});
