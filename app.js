App({
  onLaunch(options) {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        // ⚠️ 留空让小程序自动寻找已绑定的当前环境
        // 只有当你明确知道环境ID且不一致时才需要填，否则留空或只填 traceUser 即可
        traceUser: true,
      });
    }

    this.globalData = {
      userInfo: null,
      openid: null,
      inviteCode: null,
      dailyGoal: 2000, // 默认目标
      cupCapacity: 200 // 默认杯量
    };

    // 检查启动参数中的邀请码
    if (options && options.query && options.query.inviteCode) {
      this.globalData.inviteCode = options.query.inviteCode;
    }
    
    // 自动登录
    this.userLogin();
  },

  onShow(options) {
    // 检查是否有邀请码（针对后台切前台场景）
    if (options && options.query && options.query.inviteCode) {
      this.globalData.inviteCode = options.query.inviteCode;
      
      // 如果已经登录，直接尝试绑定
      if (this.globalData.openid) {
        this.tryBindFriend(this.globalData.inviteCode);
        this.globalData.inviteCode = null; // 防止重复触发
      }
    }
  },

  userLogin() {
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        console.log('[云函数] [login] user openid: ', res.result.openid)
        this.globalData.openid = res.result.openid
        if (res.result.userInfo) {
          this.globalData.userInfo = res.result.userInfo
          this.globalData.dailyGoal = res.result.userInfo.daily_goal || 2000
          this.globalData.cupCapacity = res.result.userInfo.cup_capacity || 200
        }
        
        // 如果有邀请码，尝试绑定
        if (this.globalData.inviteCode) {
          this.tryBindFriend(this.globalData.inviteCode);
        }
      },
      fail: err => {
        console.error('[云函数] [login] 调用失败', err)
      }
    })
  },

  tryBindFriend(friendOpenid) {
    if (!this.globalData.openid) return; // 还未登录
    
    wx.showModal({
      title: '好友邀请',
      content: '是否接受好友的监督邀请？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '绑定中...' });
          wx.cloud.callFunction({
            name: 'bindFriend',
            data: { friendOpenid }
          }).then(res => {
            wx.hideLoading();
            if (res.result.success) {
              wx.showToast({ title: '绑定成功' });
            } else {
              wx.showToast({ title: res.result.message, icon: 'none' });
            }
          });
        }
      }
    })
  }
});
