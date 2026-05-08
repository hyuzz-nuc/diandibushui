const app = getApp();

// 等级配置
const LEVEL_CONFIG = [
  { level: 1, exp: 0, title: '饮水小白' },
  { level: 2, exp: 100, title: '饮水萌新' },
  { level: 3, exp: 300, title: '饮水达人' },
  { level: 4, exp: 600, title: '饮水高手' },
  { level: 5, exp: 1000, title: '饮水王者' },
  { level: 6, exp: 1500, title: '饮水大神' },
  { level: 7, exp: 2500, title: '饮水宗师' },
  { level: 8, exp: 4000, title: '传奇水神' }
];

Page({
  data: {
    safeAreaTop: 110,
    level: 1,
    title: '饮水小白',
    exp: 0,
    nextLevelExp: 100,
    expPercent: 0,
    hasClaimable: false,
    activeTab: 'daily',
    dailyHasClaimable: false,
    growthHasClaimable: false,

    // 每日任务
    dailyTasks: [
      { id: 1, name: '每日签到', icon: '📅', exp: 10, action: 'login', completed: false, claimed: false },
      { id: 2, name: '记录喝水3次', icon: '💧', exp: 15, action: 'drink', progress: 0, target: 3, completed: false, claimed: false },
      { id: 3, name: '达成每日目标', icon: '🎯', exp: 20, action: 'goal', progress: 0, target: 2000, completed: false, claimed: false },
      { id: 4, name: '提醒好友喝水', icon: '👥', exp: 10, action: 'remind', progress: 0, target: 3, completed: false, claimed: false }
    ],

    // 成长任务
    growthTasks: [
      { id: 101, name: '连续打卡3天', icon: '🔥', exp: 30, action: 'checkin', progress: 0, target: 3, completed: false, claimed: false },
      { id: 102, name: '连续打卡7天', icon: '🔥', exp: 50, action: 'checkin', progress: 0, target: 7, completed: false, claimed: false },
      { id: 103, name: '连续打卡15天', icon: '🔥', exp: 80, action: 'checkin', progress: 0, target: 15, completed: false, claimed: false },
      { id: 104, name: '连续打卡30天', icon: '🔥', exp: 150, action: 'checkin', progress: 0, target: 30, completed: false, claimed: false }
    ]
  },

  onLoad() {
    this.setData({
      safeAreaTop: app.globalData.safeAreaTop || 110
    });
  },

  onShow() {
    this.loadTaskData();
  },

  // 切换Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 加载任务数据
  loadTaskData() {
    wx.cloud.callFunction({
      name: 'handleTask',
      data: { action: 'get' },
      success: res => {
        if (res.result && res.result.success) {
          const data = res.result.data;
          this.updateTaskUI(data);
        }
      },
      fail: err => {
        console.error('[handleTask] 加载失败:', err);
      }
    });
  },

  // 更新任务UI
  updateTaskUI(data) {
    const { exp, dailyTasks, growthTasks, consecutiveDays, todayWater, dailyGoal, claimedTasks } = data;
    const claimedList = claimedTasks || [];

    // 计算等级
    let level = 1;
    let title = '饮水小白';
    let nextLevelExp = 100;

    for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
      if (exp >= LEVEL_CONFIG[i].exp) {
        level = LEVEL_CONFIG[i].level;
        title = LEVEL_CONFIG[i].title;
        nextLevelExp = LEVEL_CONFIG[i + 1] ? LEVEL_CONFIG[i + 1].exp : LEVEL_CONFIG[i].exp;
        break;
      }
    }

    const expPercent = Math.min(100, (exp / nextLevelExp) * 100);

    // 更新每日任务状态
    const dailyTasksList = this.data.dailyTasks.map(task => {
      let completed = false;
      let progress = 0;

      if (task.id === 1) {
        completed = dailyTasks.login;
      } else if (task.id === 2) {
        progress = dailyTasks.drinkCount || 0;
        completed = progress >= 3;
      } else if (task.id === 3) {
        progress = todayWater;
        completed = todayWater >= dailyGoal;
      } else if (task.id === 4) {
        progress = dailyTasks.remindFriends || 0;
        completed = progress >= 3;
      }

      return {
        ...task,
        progress,
        completed,
        claimed: claimedList.includes(task.id)
      };
    });

    // 更新成长任务状态
    const growthTasksList = this.data.growthTasks.map(task => {
      return {
        ...task,
        progress: consecutiveDays,
        completed: consecutiveDays >= task.target,
        claimed: claimedList.includes(task.id)
      };
    });

    // 检查各分类是否有可领取的任务
    const dailyHasClaimable = dailyTasksList.some(t => t.completed && !t.claimed);
    const growthHasClaimable = growthTasksList.some(t => t.completed && !t.claimed);
    const hasClaimable = dailyHasClaimable || growthHasClaimable;

    this.setData({
      level,
      title,
      exp,
      nextLevelExp,
      expPercent,
      dailyTasks: dailyTasksList,
      growthTasks: growthTasksList,
      hasClaimable,
      dailyHasClaimable,
      growthHasClaimable
    });

    // 更新全局状态（用于首页红点）
    if (app.globalData) {
      app.globalData.hasClaimableTask = hasClaimable;
    }
  },

  // 去完成任务
  goToAction(e) {
    const action = e.currentTarget.dataset.action;

    switch (action) {
      case 'login':
        wx.showToast({ title: '已完成签到', icon: 'success' });
        break;
      case 'drink':
      case 'goal':
        wx.switchTab({ url: '/pages/index/index' });
        break;
      case 'remind':
        wx.switchTab({ url: '/pages/social/social' });
        break;
      case 'checkin':
        wx.switchTab({ url: '/pages/index/index' });
        break;
    }
  },

  // 领取任务奖励
  claimReward(e) {
    const taskId = e.currentTarget.dataset.id;

    wx.cloud.callFunction({
      name: 'handleTask',
      data: { action: 'claim', taskId },
      success: res => {
        if (res.result && res.result.success) {
          // 静默刷新数据
          this.loadTaskData();
        } else {
          wx.showToast({
            title: res.result?.message || '领取失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('[handleTask] 失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },

  // 一键领取所有奖励
  claimAllRewards() {
    const allTasks = [...this.data.dailyTasks, ...this.data.growthTasks];
    const claimableTasks = allTasks.filter(t => t.completed && !t.claimed);

    if (claimableTasks.length === 0) {
      wx.showToast({ title: '没有可领取的奖励', icon: 'none' });
      return;
    }

    let totalExp = 0;
    let upgraded = false;
    let newTitle = '';

    const claimOne = (index) => {
      if (index >= claimableTasks.length) {
        // 静默刷新数据
        this.loadTaskData();
        return;
      }

      wx.cloud.callFunction({
        name: 'handleTask',
        data: { action: 'claim', taskId: claimableTasks[index].id },
        success: res => {
          if (res.result && res.result.success) {
            totalExp += res.result.data.exp;
            if (res.result.data.titleUpgraded) {
              upgraded = true;
              newTitle = res.result.data.title;
            }
          }
          claimOne(index + 1);
        },
        fail: () => {
          claimOne(index + 1);
        }
      });
    };

    claimOne(0);
  },

  // 返回
  goBack() {
    wx.navigateBack();
  }
});
