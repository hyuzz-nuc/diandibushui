import Dialog from '@vant/weapp/dialog/dialog';

const TEMPLATE_ID = 'fZemoZCO7WILweXS6gV9n8bbp24bN1uH1h5Vu24-pjo'; // 请替换为真实的模板ID

Page({
  data: {
    startTime: '09:00',
    endTime: '21:00',
    interval: '1小时',
    soundEnabled: true,
    subscribeEnabled: false, // 订阅提醒开关
    showStartTimePicker: false,
    showEndTimePicker: false,
    showIntervalPicker: false,
    currentTimeValue: '09:00',
    intervalColumns: ['30分钟', '1小时', '1.5小时', '2小时']
  },

  onLoad() {
    // 从缓存或数据库加载设置
    const settings = wx.getStorageSync('user_settings') || {};
    this.setData({
      startTime: settings.startTime || '09:00',
      endTime: settings.endTime || '21:00',
      interval: settings.interval || '1小时',
      soundEnabled: settings.soundEnabled !== false,
      subscribeEnabled: settings.subscribeEnabled || false
    });
  },

  // 订阅消息开关
  onSubscribeChange({ detail }) {
    if (detail) {
      // 开启订阅
      if (TEMPLATE_ID === 'YOUR_TEMPLATE_ID_HERE') {
         wx.showToast({ title: '请先配置模板ID', icon: 'none' });
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
    
    // 2. 云端同步 (可选，如果不强制要求多端同步可只存本地)
    wx.cloud.callFunction({
      name: 'updateUserInfo',
      data: {
        settings: settings
      }
    }).catch(console.error);
    
    wx.showToast({ title: '设置已保存', icon: 'none' });
  },

  // 重新开始新手引导
  restartGuide() {
    Dialog.confirm({
      title: '重新开始新手引导',
      message: '引导过程中的数据不会影响到您的实际记录，确认要重新开始吗？',
      confirmButtonText: '现在重启',
      cancelButtonText: '稍后重启',
      confirmButtonColor: '#00B0FF'
    }).then(() => {
      // 用户选择「现在重启」
      // 清除引导状态标记
      wx.removeStorageSync('has_guided_v2');
      
      wx.showToast({
        title: '正在重启...',
        icon: 'none',
        duration: 1500
      });

      // 延迟重启小程序
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/index/index'
        });
      }, 1500);
    }).catch(() => {
      // 用户选择「稍后重启」
      // 清除引导状态标记，下次启动时进入引导
      wx.removeStorageSync('has_guided_v2');
      
      Dialog.alert({
        title: '已设置',
        message: '下次启动小程序时将自动进入新手引导，敬请期待！',
        confirmButtonText: '好的',
        confirmButtonColor: '#00B0FF'
      });
    });
  }
})
