const app = getApp();

const TEMPLATE_ID = 'fZemoZCO7WILweXS6gV9n8bbp24bN1uH1h5Vu24-pjo';

Page({
  data: {
    safeAreaTop: 110,

    // 系统提醒
    systemReminderEnabled: false,
    systemPermissionGranted: false,

    // 好友提醒
    friendReminderEnabled: false,
    friendPermissionGranted: false,

    // 时间设置
    startTime: '09:00',
    endTime: '21:00',
    interval: '1 小时',

    // 下次提醒时间
    nextReminderTime: '',

    // 提醒记录
    todayReminders: [],
    yesterdayReminders: [],
    olderReminders: [],

    // 时间选择器
    showTimePicker: false,
    timePickerTitle: '选择时间',
    pickerType: 'start', // start 或 end
    pickerValue: [9, 0],
    hours: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')),
    minutes: Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
  },

  onLoad() {
    this.setData({
      safeAreaTop: app.globalData.safeAreaTop || 110
    });
  },

  onShow() {
    this.loadSettings();
    this.loadReminderRecords();
  },

  // 加载设置
  loadSettings() {
    // 检查订阅消息权限状态
    this.checkPermissionStatus();

    // 从本地存储加载设置
    const settings = wx.getStorageSync('user_settings') || {};

    this.setData({
      startTime: settings.startTime || '09:00',
      endTime: settings.endTime || '21:00',
      interval: settings.interval || '1 小时',
      systemReminderEnabled: settings.subscribeEnabled || false
    });

    // 计算下次提醒时间
    this.calculateNextReminder();
  },

  // 检查权限状态
  checkPermissionStatus() {
    const hasSubscribed = wx.getStorageSync('has_subscribed_water_remind') || false;

    this.setData({
      systemPermissionGranted: hasSubscribed,
      friendPermissionGranted: hasSubscribed // 好友提醒使用同一个模板
    });

    // 如果开关开着但权限未授权，显示警告
    const settings = wx.getStorageSync('user_settings') || {};
    if (settings.subscribeEnabled && !hasSubscribed) {
      console.warn('[提醒] 开关已开启但权限未授权');
    }
  },

  // 系统提醒开关变化
  onSystemReminderChange(e) {
    const checked = e.detail;

    if (checked) {
      // 开启时先请求权限
      wx.requestSubscribeMessage({
        tmplIds: [TEMPLATE_ID],
        success: (res) => {
          if (res[TEMPLATE_ID] === 'accept') {
            wx.setStorageSync('has_subscribed_water_remind', true);
            this.setData({
              systemReminderEnabled: true,
              systemPermissionGranted: true
            });
            this.saveSettings();
            wx.showToast({ title: '提醒已开启', icon: 'success' });
          } else {
            wx.showToast({ title: '请同意授权', icon: 'none' });
            this.setData({ systemReminderEnabled: false });
          }
        },
        fail: (err) => {
          console.error('[订阅消息] 请求失败:', err);
          wx.showToast({ title: '授权失败', icon: 'none' });
          this.setData({ systemReminderEnabled: false });
        }
      });
    } else {
      // 关闭
      this.setData({ systemReminderEnabled: false });
      this.saveSettings();
    }
  },

  // 好友提醒开关变化
  onFriendReminderChange(e) {
    const checked = e.detail;

    if (checked) {
      wx.requestSubscribeMessage({
        tmplIds: [TEMPLATE_ID],
        success: (res) => {
          if (res[TEMPLATE_ID] === 'accept') {
            wx.setStorageSync('has_subscribed_water_remind', true);
            this.setData({
              friendReminderEnabled: true,
              friendPermissionGranted: true
            });
            wx.showToast({ title: '好友提醒已开启', icon: 'success' });
          } else {
            wx.showToast({ title: '请同意授权', icon: 'none' });
            this.setData({ friendReminderEnabled: false });
          }
        },
        fail: (err) => {
          console.error('[订阅消息] 请求失败:', err);
          wx.showToast({ title: '授权失败', icon: 'none' });
          this.setData({ friendReminderEnabled: false });
        }
      });
    } else {
      this.setData({ friendReminderEnabled: false });
    }
  },

  // 显示开始时间选择器
  showStartTimePicker() {
    const [hour, minute] = this.data.startTime.split(':').map(Number);
    this.setData({
      showTimePicker: true,
      timePickerTitle: '开始时间',
      pickerType: 'start',
      pickerValue: [hour, minute]
    });
  },

  // 显示结束时间选择器
  showEndTimePicker() {
    const [hour, minute] = this.data.endTime.split(':').map(Number);
    this.setData({
      showTimePicker: true,
      timePickerTitle: '结束时间',
      pickerType: 'end',
      pickerValue: [hour, minute]
    });
  },

  // 关闭时间选择器
  closeTimePicker() {
    this.setData({ showTimePicker: false });
  },

  // 时间选择器变化
  onPickerChange(e) {
    this.setData({ pickerValue: e.detail.value });
  },

  // 确认时间
  confirmTime() {
    const [hourIdx, minuteIdx] = this.data.pickerValue;
    const hour = this.data.hours[hourIdx];
    const minute = this.data.minutes[minuteIdx];
    const time = `${hour}:${minute}`;

    if (this.data.pickerType === 'start') {
      this.setData({ startTime: time, showTimePicker: false });
    } else {
      this.setData({ endTime: time, showTimePicker: false });
    }

    this.saveSettings();
    this.calculateNextReminder();
  },

  // 选择间隔
  selectInterval(e) {
    const interval = e.currentTarget.dataset.interval;
    this.setData({ interval });
    this.saveSettings();
    this.calculateNextReminder();
  },

  // 保存设置
  saveSettings() {
    const settings = {
      startTime: this.data.startTime,
      endTime: this.data.endTime,
      interval: this.data.interval,
      subscribeEnabled: this.data.systemReminderEnabled,
      soundEnabled: true
    };

    wx.setStorageSync('user_settings', settings);

    // 同步到云端
    wx.cloud.callFunction({
      name: 'updateUserInfo',
      data: { settings }
    }).then(res => {
      console.log('[设置] 已同步到云端');
    }).catch(err => {
      console.error('[设置] 同步失败:', err);
    });
  },

  // 计算下次提醒时间
  calculateNextReminder() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = this.data.startTime.split(':').map(Number);
    const [endHour, endMin] = this.data.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    let intervalMinutes = 60;
    if (this.data.interval.includes('30')) intervalMinutes = 30;
    else if (this.data.interval.includes('1.5')) intervalMinutes = 90;
    else if (this.data.interval.includes('2')) intervalMinutes = 120;

    let nextMinutes = null;

    if (currentMinutes < startMinutes) {
      // 还没到开始时间，下次提醒是开始时间
      nextMinutes = startMinutes;
    } else if (currentMinutes >= endMinutes) {
      // 已过结束时间，下次提醒是明天开始时间
      nextMinutes = startMinutes;
    } else {
      // 在时间段内，找下一个提醒点
      const elapsed = currentMinutes - startMinutes;
      const nextPoint = Math.ceil(elapsed / intervalMinutes) * intervalMinutes;
      nextMinutes = startMinutes + nextPoint;

      if (nextMinutes > endMinutes) {
        nextMinutes = startMinutes; // 超过结束时间，显示明天
      }
    }

    if (nextMinutes !== null) {
      const hour = Math.floor(nextMinutes / 60);
      const minute = nextMinutes % 60;
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

      if (currentMinutes >= endMinutes) {
        this.setData({ nextReminderTime: `明天 ${timeStr}` });
      } else {
        this.setData({ nextReminderTime: `今天 ${timeStr}` });
      }
    }
  },

  // 加载提醒记录
  loadReminderRecords() {
    // 从本地存储加载提醒记录
    const records = wx.getStorageSync('reminder_records') || [];

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0)).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

    const todayReminders = [];
    const yesterdayReminders = [];
    const olderReminders = [];

    records.forEach(record => {
      const recordTime = new Date(record.timestamp).getTime();

      if (recordTime >= todayStart) {
        todayReminders.push(record);
      } else if (recordTime >= yesterdayStart) {
        yesterdayReminders.push(record);
      } else {
        olderReminders.push(record);
      }
    });

    this.setData({
      todayReminders,
      yesterdayReminders,
      olderReminders
    });
  },

  // 返回
  goBack() {
    wx.navigateBack();
  }
});
