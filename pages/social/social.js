import Dialog from '@vant/weapp/dialog/dialog';

// TODO: 请在此处填入您在微信公众平台申请的“订阅消息”模板ID
// 模板标题建议：喝水提醒
// 关键词建议：温馨提示(thing1)、提醒时间(time2)、备注(thing3)
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

  onLoad(options) {
    this.loadFriends();
    this.loadRecommendations();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        active: 1
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
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name || '好友';
    
    // 防抖
    if (this._reminding) return;
    this._reminding = true;

    wx.showLoading({ title: '发送中...' });

    wx.cloud.callFunction({
      name: 'sendRemind',
      data: {
        friendOpenid: id,
        friendName: name,
        templateId: REMIND_TEMPLATE_ID
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result.success) {
        wx.showToast({ 
          title: res.result.isSimulated ? '模拟提醒成功' : '已提醒', 
          icon: 'success' 
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
            icon: 'none' 
          });
        }
      }
    }).catch(err => {
      wx.hideLoading();
      console.error(err);
      wx.showToast({ title: '网络错误', icon: 'none' });
    }).finally(() => {
      this._reminding = false;
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
    const id = e.currentTarget.dataset.id;
    Dialog.confirm({
      title: '添加好友',
      message: '确定要添加对方为好友吗？'
    }).then(() => {
      wx.showLoading({ title: '添加中...', mask: true });
      
      wx.cloud.callFunction({
        name: 'bindFriend',
        data: {
          friendOpenid: id
        }
      }).then(res => {
        wx.hideLoading();
        if (res.result.success) {
          wx.showToast({ title: '添加成功', icon: 'success' });
          // 刷新推荐列表和好友列表
          this.loadRecommendations();
          this.loadFriends();
          // 自动切回好友列表Tab? 可选，这里暂不切换，保持在找搭子页面继续添加
        } else {
          wx.showToast({ 
            title: res.result.message || '添加失败', 
            icon: 'none' 
          });
        }
      }).catch(err => {
        wx.hideLoading();
        console.error(err);
        wx.showToast({ title: '网络错误', icon: 'none' });
      });
    }).catch(() => {
      // 取消操作
    });
  }
})