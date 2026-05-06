import Dialog from '@vant/weapp/dialog/dialog';

const TEMPLATE_ID = 'fZemoZCO7WILweXS6gV9n8bbp24bN1uH1h5Vu24-pjo'; // 请替换为真实的模板 ID

Page({
  data: {
    startTime: '09:00',
    endTime: '21:00',
    interval: '1 小时',
    soundEnabled: true,
    subscribeEnabled: false, // 订阅提醒开关
    hasSubscribed: false, // 是否已授权订阅消息
    showStartTimePicker: false,
    showEndTimePicker: false,
    showIntervalPicker: false,
    currentTimeValue: '09:00',
    intervalColumns: ['30 分钟', '1 小时', '1.5 小时', '2 小时']
  },

  onLoad() {
    // 设置顶部安全距离（自动适配胶囊按钮）
    const app = getApp();
    const safeAreaTop = app.globalData.safeAreaTop || 110;
    this.setData({ safeAreaTop });
    
    // 从缓存或数据库加载设置
    const settings = wx.getStorageSync('user_settings') || {};
    const hasSubscribed = wx.getStorageSync('has_subscribed_water_remind') || false;
    
    this.setData({
      startTime: settings.startTime || '09:00',
      endTime: settings.endTime || '21:00',
      interval: settings.interval || '1 小时',
      soundEnabled: settings.soundEnabled !== false,
      subscribeEnabled: settings.subscribeEnabled || false,
      hasSubscribed: hasSubscribed
    });
  },
  
  onShow() {
    // 每次进入页面重新检查授权状态
    const hasSubscribed = wx.getStorageSync('has_subscribed_water_remind') || false;
    this.setData({ hasSubscribed: hasSubscribed });
  },
  
  // 订阅消息授权按钮
  onSubscribeMsg() {
    console.log('[settings] 用户点击订阅授权');
    
    wx.requestSubscribeMessage({
      tmplIds: [TEMPLATE_ID],
      success: (res) => {
        console.log('[settings] 订阅结果:', res);
        if (res[TEMPLATE_ID] === 'accept') {
          wx.setStorageSync('has_subscribed_water_remind', true);
          wx.showToast({ title: '授权成功', icon: 'success' });
          this.setData({ hasSubscribed: true });
        } else {
          wx.showToast({ title: '您取消了授权', icon: 'none', duration: 2000 });
        }
      },
      fail: (err) => {
        console.error('[settings] 订阅失败:', err);
        wx.showToast({ title: '授权失败', icon: 'none', duration: 2000 });
      }
    });
  },

  // 订阅消息开关
  onSubscribeChange({ detail }) {
    if (detail) {
      // 开启订阅
      if (TEMPLATE_ID === 'YOUR_TEMPLATE_ID_HERE') {
         wx.showToast({ title: '请先配置模板 ID', icon: 'none' });
         // 模拟开启成功，仅供演示
         this.setData({ subscribeEnabled: true });
         this.saveSettings();
         return;
      }

      wx.requestSubscribeMessage({
        tmplIds: [TEMPLATE_ID],
        success: (res) => {
          if (res[TEMPLATE_ID] === 'accept') {
            wx.showToast({ title: '订阅成功', icon: 'success' });
            this.setData({ subscribeEnabled: true });
            this.saveSettings();
          } else {
            wx.showToast({ title: '您取消了授权', icon: 'none' });
            // 开关自动回弹
            this.setData({ subscribeEnabled: false });
          }
        },
        fail: (err) => {
          console.error(err);
          wx.showToast({ title: '订阅失败', icon: 'none' });
          this.setData({ subscribeEnabled: false });
        }
      });
    } else {
      // 关闭订阅 (前端逻辑上的关闭，无法取消微信侧授权，只是状态标记)
      this.setData({ subscribeEnabled: false });
      this.saveSettings();
    }
  },

  // 开关音效
  onSoundChange({ detail }) {
    this.setData({ soundEnabled: detail });
    this.saveSettings();
  },

  // 开始时间
  showStartTime() {
    this.setData({ showStartTimePicker: true, currentTimeValue: this.data.startTime });
  },
  onConfirmStartTime(event) {
    this.setData({
      startTime: event.detail,
      showStartTimePicker: false
    });
    this.saveSettings();
  },
  onCancelStartTime() {
    this.setData({ showStartTimePicker: false });
  },

  // 结束时间
  showEndTime() {
    this.setData({ showEndTimePicker: true, currentTimeValue: this.data.endTime });
  },
  onConfirmEndTime(event) {
    this.setData({
      endTime: event.detail,
      showEndTimePicker: false
    });
    this.saveSettings();
  },
  onCancelEndTime() {
    this.setData({ showEndTimePicker: false });
  },

  // 间隔选择
  showInterval() {
    this.setData({ showIntervalPicker: true });
  },
  onConfirmInterval(event) {
    const { value } = event.detail;
    this.setData({
      interval: value,
      showIntervalPicker: false
    });
    this.saveSettings();
  },
  onCancelInterval() {
    this.setData({ showIntervalPicker: false });
  },

  // 保存设置到本地和云端
  saveSettings() {
    const settings = {
      startTime: this.data.startTime,
      endTime: this.data.endTime,
      interval: this.data.interval,
      soundEnabled: this.data.soundEnabled,
      subscribeEnabled: this.data.subscribeEnabled
    };

    // 1. 本地存储
    wx.setStorageSync('user_settings', settings);

    // 2. 云端同步
    wx.cloud.callFunction({
      name: 'updateUserInfo',
      data: {
        settings: settings
      }
    }).then(() => {
      wx.showToast({ title: '设置已保存', icon: 'none' });

      // 如果开启了订阅提醒，提示用户
      if (settings.subscribeEnabled) {
        wx.showModal({
          title: '提醒设置',
          content: '设置已保存！系统将在设定时间段内按间隔发送喝水提醒。\n\n注意：需要在云开发控制台配置定时触发器才能生效。',
          showCancel: false,
          confirmText: '知道了'
        });
      }
    }).catch(err => {
      console.error('保存设置失败:', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    });
  }
})
