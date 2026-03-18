import Dialog from '@vant/weapp/dialog/dialog';

// TODO: 请在此处填入您在微信公众平台申请的"订阅消息"模板 ID
// 模板标题建议：喝水提醒
// 关键词建议：温馨提示 (thing1)、提醒时间 (time2)、备注 (thing3)
const REMIND_TEMPLATE_ID = 'fZemoZCO7WILweXS6gV9n8bbp24bN1uH1h5Vu24-pjo'; 

Page({
  data: {
    activeTab: 0,
    friends: [],
    loadingFriends: true,
    recommendations: [],
    loadingRecommend: true,
    refreshingRecommend: false,
    showSocialGuideAction: false
  },

  onLoad() {
    // 设置顶部安全距离（自动适配胶囊按钮）
    this.setTopBarStyle();
    
    this.loadFriends();
    this.loadRecommendations();
  },
  
  // 设置顶部安全距离（自动适配胶囊按钮）
  setTopBarStyle() {
    const app = getApp();
    this.setData({ 
      safeAreaTop: app.globalData.safeAreaTop || 110 
    });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        active: 1 // 社交页
      })
    }
    
    // 检查是否有引导任务
    const app = getApp();
    if (app.globalData && app.globalData.socialGuidePending) {
      // 引导期间隐藏导航栏
      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().setVisibility(true);
      }
      this.setData({ showSocialGuideAction: true });
      app.globalData.socialGuidePending = false; // 清除标记
    }
  },
  
  onFinishSocialGuide() {
    this.setData({ showSocialGuideAction: false });
    
    // 恢复导航栏显示
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setVisibility(false);
    }
    
    // 设置全局标记，准备在 Index 页面显示最终弹窗
    const app = getApp();
    if (app.globalData) {
      app.globalData.finishGuidePending = true;
    }
    
    // 提示过渡，增加丝滑感
    wx.showToast({
      title: '正在返回...',
      icon: 'loading',
      duration: 1000,
      mask: true
    });

    // 延迟跳转，配合过渡动画
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }, 800);
  },

  onPullDownRefresh() {
    const promises = [this.loadFriends()];
    if (this.data.activeTab === 1) {
      promises.push(this.loadRecommendations());
    }
    Promise.all(promises).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onTabChange(event) {
    this.setData({ activeTab: event.detail.index });
  },

  // 加载好友列表
  loadFriends() {
    this.setData({ loadingFriends: true });
    return wx.cloud.callFunction({
      name: 'getFriendsList'
    }).then(res => {
      if (res.result.success) {
        this.setData({ friends: res.result.data });
      }
    }).catch(console.error)
      .finally(() => {
        this.setData({ loadingFriends: false });
      });
  },

  // 加载推荐搭子
  loadRecommendations() {
    this.setData({ loadingRecommend: true });
    return wx.cloud.callFunction({
      name: 'recommendFriends'
    }).then(res => {
      if (res.result.success) {
        this.setData({ recommendations: res.result.data });
      }
    }).catch(console.error)
      .finally(() => {
        this.setData({ loadingRecommend: false, refreshingRecommend: false });
      });
  },

  // 刷新推荐
  refreshRecommend() {
    this.setData({ refreshingRecommend: true });
    this.loadRecommendations();
  },

  // 开启订阅消息权限
  onSubscribeMsg() {
    if (REMIND_TEMPLATE_ID === 'YOUR_TEMPLATE_ID_HERE') {
      wx.showModal({
        title: '开发提示',
        content: '请先在 pages/social/social.js 文件中配置 REMIND_TEMPLATE_ID (微信公众平台申请)',
        showCancel: false
      });
      return;
    }

    wx.requestSubscribeMessage({
      tmplIds: [REMIND_TEMPLATE_ID],
      success: (res) => {
        if (res[REMIND_TEMPLATE_ID] === 'accept') {
          wx.showToast({ title: '开启成功' });
        } else {
          wx.showToast({ title: '您取消了授权', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error(err);
        wx.showToast({ title: '授权失败', icon: 'none' });
      }
    });
  },

  // 提醒好友
  onRemind(e) {
    console.log('[onRemind] 触发提醒，e:', e);
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name || '好友';
    
    console.log('[onRemind] friendOpenid:', id, 'friendName:', name);
    
    // 防抖
    if (this._reminding) return;
    this._reminding = true;

    // 先检查用户是否已授权订阅消息
    const hasSubscribed = wx.getStorageSync('has_subscribed_water_remind');
    
    if (!hasSubscribed) {
      // 用户还未授权，先引导授权
      this.requestSubscribeAndRemind(id, name);
    } else {
      // 已授权，直接发送
      this.sendRemindRequest(id, name);
    }
  },
  
  // 请求订阅授权并发送提醒
  requestSubscribeAndRemind(friendOpenid, friendName) {
    console.log('[requestSubscribeAndRemind] 引导用户授权订阅消息');
    
    wx.showModal({
      title: '开启喝水提醒',
      content: '需要您先授权订阅消息权限，才能给好友发送提醒哦～',
      confirmText: '去授权',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 调用订阅消息授权弹窗
          wx.requestSubscribeMessage({
            tmplIds: [REMIND_TEMPLATE_ID],
            success: (subscribeRes) => {
              console.log('[requestSubscribeAndRemind] 订阅结果:', subscribeRes);
              
              if (subscribeRes[REMIND_TEMPLATE_ID] === 'accept') {
                // 用户同意，记录授权状态
                wx.setStorageSync('has_subscribed_water_remind', true);
                wx.showToast({ title: '授权成功', icon: 'success' });
                
                // 发送提醒
                this.sendRemindRequest(friendOpenid, friendName);
              } else {
                wx.showToast({ title: '您取消了授权', icon: 'none', duration: 2000 });
              }
            },
            fail: (err) => {
              console.error('[requestSubscribeAndRemind] 订阅失败:', err);
              wx.showToast({ title: '授权失败', icon: 'none', duration: 2000 });
            }
          });
        }
      }
    });
  },
  
  // 发送提醒请求
  sendRemindRequest(friendOpenid, friendName) {
    wx.showLoading({ title: '发送中...', mask: true });

    wx.cloud.callFunction({
      name: 'sendRemind',
      data: {
        friendOpenid: friendOpenid,
        friendName: friendName,
        templateId: REMIND_TEMPLATE_ID
      }
    }).then(res => {
      console.log('[sendRemindRequest] 云函数返回:', res);
      wx.hideLoading();
      if (res.result.success) {
        wx.showToast({ 
          title: res.result.isSimulated ? '模拟提醒成功' : '已提醒', 
          icon: 'success',
          duration: 2000
        });
      } else {
        // 特殊处理未订阅的情况
        if (res.result.errCode === 43101) {
          wx.showModal({
            title: '提示',
            content: '对方还没有订阅喝水提醒，无法接收消息哦',
            showCancel: false
          });
        } else {
          wx.showToast({ 
            title: res.result.message || '发送失败', 
            icon: 'none',
            duration: 2000
          });
        }
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('[sendRemindRequest] 云函数调用失败:', err);
      wx.showToast({ title: '网络错误', icon: 'none', duration: 2000 });
    }).finally(() => {
      this._reminding = false;
      console.log('[sendRemindRequest] 防抖解锁');
    });
  },

  // 分享给好友（生成邀请链接）
  onShareAppMessage() {
    const app = getApp();
    const myOpenid = app.globalData.openid;
    const myName = app.globalData.userInfo && app.globalData.userInfo.nickName || '你的好友';
    
    return {
      title: `${myName} 邀请你一起喝水打卡，快来加入吧！`,
      path: `/pages/index/index?inviteCode=${myOpenid}`,
      imageUrl: '/images/share-cover.png' // 自定义分享封面图
    };
  },

  // 添加好友
  onAddFriend(e) {
    console.log('[onAddFriend] 触发添加好友，e:', e);
    const id = e.currentTarget.dataset.id;
    console.log('[onAddFriend] friendOpenid:', id);
    
    Dialog.confirm({
      title: '添加好友',
      message: '确定要添加对方为好友吗？',
      confirmButtonColor: '#00B0FF'
    }).then(() => {
      console.log('[onAddFriend] 用户确认添加');
      wx.showLoading({ title: '添加中...', mask: true });
      
      wx.cloud.callFunction({
        name: 'bindFriend',
        data: {
          friendOpenid: id
        }
      }).then(res => {
        console.log('[onAddFriend] 云函数返回:', res);
        wx.hideLoading();
        if (res.result.success) {
          wx.showToast({ title: '添加成功', icon: 'success', duration: 2000 });
          // 刷新推荐列表和好友列表
          this.loadRecommendations();
          this.loadFriends();
        } else {
          wx.showToast({ 
            title: res.result.message || '添加失败', 
            icon: 'none',
            duration: 2000
          });
        }
      }).catch(err => {
        wx.hideLoading();
        console.error('[onAddFriend] 云函数调用失败:', err);
        wx.showToast({ title: '网络错误', icon: 'none', duration: 2000 });
      });
    }).catch(() => {
      console.log('[onAddFriend] 用户取消添加');
    });
  }
})
