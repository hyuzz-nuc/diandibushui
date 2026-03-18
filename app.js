App({
  onLaunch(options) {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        // ⚠️ 留空让小程序自动寻找已绑定的当前环境
        // 只有当你明确知道环境 ID 且不一致时才需要填，否则留空或只填 traceUser 即可
        traceUser: true,
      });
    }

    this.globalData = {
      userInfo: null,
      openid: null,
      inviteCode: null,
      dailyGoal: 2000, // 默认目标
      cupCapacity: 200, // 默认杯量
      safeAreaTop: 110 // 顶部安全距离默认值（px）
    };

    // 获取胶囊按钮信息，自动计算安全距离
    this.initSafeArea();

    // 检查启动参数中的邀请码
    if (options && options.query && options.query.inviteCode) {
      this.globalData.inviteCode = options.query.inviteCode;
    }
    
    // 自动登录
    this.userLogin();
  },

  // 初始化安全区域（自动适配胶囊按钮）
  initSafeArea() {
    try {
      // 获取胶囊按钮信息
      const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
      
      // 计算安全距离 = 胶囊顶部距离 + 胶囊高度 + 额外间距 (10px)
      const safeAreaTop = menuButtonInfo.top + menuButtonInfo.height + 10;
      
      console.log('[安全区域] 胶囊信息:', menuButtonInfo);
      console.log('[安全区域] 计算安全距离:', safeAreaTop, 'px');
      
      this.globalData.safeAreaTop = safeAreaTop;
    } catch (err) {
      console.error('[安全区域] 获取失败:', err);
      // 使用默认值
      this.globalData.safeAreaTop = 110;
    }
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
        console.error('[云函数] [login] 失败：', err)
      },
      complete: res => {
        console.log('[云函数] [login] 完成')
      }
    })
  },

  tryBindFriend(inviteCode) {
    if (!inviteCode || inviteCode === this.globalData.openid) {
      return; // 邀请码无效或自己邀请自己
    }

    wx.cloud.callFunction({
      name: 'bindFriend',
      data: {
        friendOpenid: inviteCode
      },
      success: res => {
        if (res.result.success) {
          wx.showToast({
            title: '好友绑定成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: res.result.message || '绑定失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('[绑定好友] 失败：', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },

  globalData: {
    userInfo: null
  }
});
