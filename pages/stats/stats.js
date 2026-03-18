Page({
  data: {
    year: 0,
    month: 0,
    monthText: '',
    calendarCells: [],
    dailyGoal: 2000,
    consecutiveDays: 0,
    totalDays: 0,
    reachRate: 0,
    avgAmount: 0,
    weekSeries: [],
    safeAreaTop: 110
  },
  onLoad() {
    // 设置顶部安全距离（自动适配胶囊按钮）
    const app = getApp();
    this.setData({ 
      safeAreaTop: app.globalData.safeAreaTop || 110 
    });
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        active: 2 // 统计页
      })
    }
    if (!this.data.year) {
      const now = new Date();
      this.setData({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      });
    }
    this.refreshAll();
  },

  onPrevMonth() {
    let { year, month } = this.data;
    month -= 1;
    if (month <= 0) {
      year -= 1;
      month = 12;
    }
    this.setData({ year, month });
    this.refreshAll();
  },

  onNextMonth() {
    let { year, month } = this.data;
    month += 1;
    if (month >= 13) {
      year += 1;
      month = 1;
    }
    this.setData({ year, month });
    this.refreshAll();
  },

  refreshAll() {
    this.setMonthText();
    this.buildCalendarSkeleton();
    this.loadCalendarStats();
    this.loadWeekTrend();
  },

  setMonthText() {
    const m = this.data.month < 10 ? `0${this.data.month}` : `${this.data.month}`;
    this.setData({ monthText: `${this.data.year}-${m}` });
  },

  pad2(n) {
    return n < 10 ? `0${n}` : `${n}`;
  },

  formatYMD(date) {
    return `${date.getFullYear()}-${this.pad2(date.getMonth() + 1)}-${this.pad2(date.getDate())}`;
  },

  buildCalendarSkeleton(reachedSet) {
    const { year, month } = this.data;
    const first = new Date(year, month - 1, 1);
    const firstWeekday = (first.getDay() + 6) % 7; // Monday=0
    const daysInMonth = new Date(year, month, 0).getDate();
    const prevMonthDays = new Date(year, month - 1, 0).getDate();

    const todayKey = this.formatYMD(new Date());
    const cells = [];

    for (let i = 0; i < 42; i++) {
      const index = i - firstWeekday;
      let day = 0;
      let cellYear = year;
      let cellMonth = month;
      let isCurrentMonth = true;

      if (index < 0) {
        day = prevMonthDays + index + 1;
        isCurrentMonth = false;
        cellMonth = month - 1;
        if (cellMonth <= 0) {
          cellMonth = 12;
          cellYear = year - 1;
        }
      } else if (index >= daysInMonth) {
        day = index - daysInMonth + 1;
        isCurrentMonth = false;
        cellMonth = month + 1;
        if (cellMonth >= 13) {
          cellMonth = 1;
          cellYear = year + 1;
        }
      } else {
        day = index + 1;
      }

      const key = `${cellYear}-${this.pad2(cellMonth)}-${this.pad2(day)}`;
      const reached = reachedSet ? reachedSet.has(key) : false;
      const isToday = key === todayKey;

      cells.push({
        key,
        day,
        isCurrentMonth,
        reached,
        isToday
      });
    }

    this.setData({ calendarCells: cells });
  },

  loadCalendarStats() {
    wx.cloud.callFunction({
      name: 'getCheckinCalendar',
      data: { year: this.data.year, month: this.data.month }
    }).then(res => {
      if (!res.result || !res.result.success) {
        wx.showToast({ title: '统计加载失败', icon: 'none' });
        return;
      }
      const { reachedDates, consecutiveDays, totalDays, reachRate, avgAmount, dailyGoal } = res.result.data;
      const reachedSet = new Set(reachedDates || []);
      this.buildCalendarSkeleton(reachedSet);
      this.setData({
        dailyGoal,
        consecutiveDays,
        totalDays,
        reachRate,
        avgAmount
      });
    }).catch(err => {
      console.error(err);
      wx.showToast({ title: '统计网络异常', icon: 'none' });
    });
  },

  loadWeekTrend() {
    wx.cloud.callFunction({
      name: 'getCheckinCalendar', // 复用这个云函数，它其实应该改名叫 getStats 更好，但为了稳健我们只在 getCheckinCalendar 里补充周趋势逻辑
      data: { year: this.data.year, month: this.data.month, includeWeek: true }
    }).then(res => {
      if (!res.result || !res.result.success) return;
      const { series, dailyGoal } = res.result.data;
      if (series) {
        const maxAmount = series.reduce((m, x) => Math.max(m, x.amount), 0) || dailyGoal || 2000;
        const weekSeries = series.map(x => ({
          ...x,
          barWidth: Math.max(0, Math.min(100, Math.round((x.amount / maxAmount) * 100)))
        }));
        this.setData({ weekSeries });
      }
    }).catch(() => {});
  }
});
