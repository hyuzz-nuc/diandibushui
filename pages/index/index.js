import Dialog from '@vant/weapp/dialog/dialog';

const app = getApp()

Page({
  data: {
    currentWater: 0,
    dailyGoal: 2000,
    percent: 0,
    gradientColor: {
      '0%': '#4FC3F7',
      '100%': '#00B0FF',
    },
    consecutiveDays: 0, // 连续打卡天数
    showRecommendDialog: false,
    weight: '',
    occupation: 'office', // 默认职业：office (脑力/办公), light (轻体力), heavy (重体力)
    recommendGoal: 0,
    activeGoalTab: 0,
    customGoalInput: '',
    
    // 自定义与参考相关
    showCustomDialog: false,
    customAmount: '',
    showCupGuide: false,
    cupTypes: [
      { name: '一次性纸杯', volume: 200, icon: '🥤' },
      { name: '标准马克杯', volume: 350, icon: '☕' },
      { name: '保温杯', volume: 450, icon: '🍵' },
      { name: '矿泉水 (小)', volume: 350, icon: '💧' },
      { name: '矿泉水 (中)', volume: 550, icon: '🍼' },
      { name: '运动水壶', volume: 750, icon: '🏃' }
    ],

    // 底部确认弹窗相关
    showConfirmPopup: false,
    pendingAmount: 0,
    
    // 系统弹窗显示状态（用于控制圆环隐藏）
    isSystemDialogShowing: false,
    
    // 新手引导相关
    showGuideOverlay: false, // 是否显示引导遮罩
    guideStep: 0, // 0:无，1:Welcome, 2:Goal, 3:Notify, 4:Action, 5:Social
    
    // 引导弹窗控制
    showWelcomeDialog: false,
    showSocialGuideDialog: false,
    showFinalDialog: false, // 最终完成弹窗
    
    // 目标设置引导分步状态
    // 0: 初始选择模式 (智能 vs 自定义)
    // 1: 智能 - 输入体重
    // 2: 智能 - 选择职业
    // 3: 智能 - 结果确认
    // 4: 自定义 - 输入数值
    goalGuideSubStep: 0,
    
    // 原始数据备份（用于引导结束后恢复）
    originalDailyGoal: 2000,
    
    // 通知中心
    showNotificationPanel: false,
    notices: [],
    hasUnreadNotice: false,
  },

  onLoad(options) {
    if (options && options.inviteCode) {
      app.globalData.inviteCode = options.inviteCode;
    }
    
    // 备份原始目标
    const dailyGoal = app.globalData.dailyGoal || 2000;
    this.setData({
      dailyGoal: dailyGoal,
      originalDailyGoal: dailyGoal
    })
    
    this.loadTodayRecord();
    
    // 加载通知
    this.loadNotices();
    
    // 模拟测试：如果有邀请码，添加邀请通知
    if (app.globalData.inviteCode) {
      this.addNotice('invite', '好友邀请', '你有一个好友邀请你一起喝水打卡');
    }
    
    // 检查是否需要启动新手引导
    const hasGuided = wx.getStorageSync('has_guided_v2');
    if (!hasGuided) {
      this.startNewUserGuide();
    }
  },
  
  onShow() {
    this.updateGreeting();
    
    setTimeout(() => {
      try {
        if (typeof this.getTabBar === 'function') {
          const tabBar = this.getTabBar();
          if (tabBar && typeof tabBar.setData === 'function') {
            tabBar.setData({
              active: 0 // 首页
            });
          }
        }
      } catch (e) {
        console.warn('[onShow] tabBar setData failed:', e);
      }
    }, 100);
    
    // 检查是否有结束引导的任务（从 Social 页面跳回）
    const app = getApp();
    if (app.globalData && app.globalData.finishGuidePending) {
      app.globalData.finishGuidePending = false; // 清除标记
      
      // 强制重置其他弹窗状态，避免冲突
      this.setData({
        showRecommendDialog: false,
        showWelcomeDialog: false,
        showSocialGuideDialog: false,
        isSystemDialogShowing: false
      });

      // 稍微延迟，等待页面渲染稳定后显示
      setTimeout(() => {
        this.setData({ showFinalDialog: true });
      }, 600);
    }
  },

  // 最终弹窗确认回调
  onConfirmFinalDialog() {
    this.setData({ showFinalDialog: false });
    this.finishGuide();
  },

  // 结束引导
  finishGuide() {
    console.log('[finishGuide] 开始恢复导航栏');
    
    // 恢复数据
    const originalGoal = this.data.originalDailyGoal;
    this.setData({ 
      showGuideOverlay: false, 
      guideStep: 0,
      showFinalDialog: false,
      showRecommendDialog: false,
      showWelcomeDialog: false,
      showSocialGuideDialog: false,
      isSystemDialogShowing: false,
      dailyGoal: originalGoal,
      currentWater: 0,
      percent: this.calculatePercent(0, originalGoal)
    });
    
    // 同步到全局
    if (app.globalData) app.globalData.dailyGoal = originalGoal;

    wx.setStorageSync('has_guided_v2', true);
    
    // 恢复底部 tabbar（延迟执行，确保 DOM 渲染完成）
    setTimeout(() => {
      console.log('[finishGuide] setTimeout 执行');
      const tabBar = this.getTabBar();
      console.log('[finishGuide] tabBar:', tabBar);
      if (typeof this.getTabBar === 'function' && tabBar) {
        console.log('[finishGuide] 调用 setVisibility(false)');
        tabBar.setVisibility(false); // false = 显示 TabBar
      }
    }, 300);
  },

  // 引导步骤控制器
  nextGuideStep() {
    const currentStep = this.data.guideStep;
    
    if (currentStep === 1) {
      // Welcome -> Goal
      this.data.isSwitchingStep = true; // 标记正在切换，防止触发 onCloseDialog
      this.setData({ 
        showWelcomeDialog: false,
        showRecommendDialog: true, // 开启目标设置
        guideStep: 2
      });
    } else if (currentStep === 2) {
      // Goal -> Notify (在 confirmRecommend 中触发)
      // 逻辑已在 confirmRecommend 中处理
    } else if (currentStep === 3) {
      // Notify -> Action (在 askForNotification 完成后触发)
      // 以前是 Social，现在改为先记录第一杯水
      this.data.isSwitchingStep = true; // 标记正在切换
      this.startGuideAction();
    } else if (currentStep === 4) {
      // Action -> Social (在 simulateAddWater 完成后触发)
      // 逻辑已在 simulateAddWater 中处理
    } else if (currentStep === 5) {
      // Social -> Finish (Jump to Social Page)
      this.data.isSwitchingStep = true;
      this.setData({ showSocialGuideDialog: false });
      
      // 标记引导跳转
      if (app.globalData) {
        app.globalData.socialGuidePending = true;
      }
      
      // 跳转到 Social 页面继续引导
      wx.switchTab({
        url: '/pages/social/social'
      });
    }
  },

  // 展示社交引导 (Step 5)
  showSocialGuide() {
    console.log('[showSocialGuide] 进入 Step 5 - 社交引导');
    this.setData({
      showSocialGuideDialog: true,
      guideStep: 5,
      isSystemDialogShowing: true // 确保遮罩层正确显示
    });
  },

  updateGreeting() {
    const hour = new Date().getHours();
    let greeting = '';
    if (hour < 6) greeting = '夜深了，注意休息';
    else if (hour < 9) greeting = '早上好，记得喝水哦';
    else if (hour < 12) greeting = '上午好，工作加油';
    else if (hour < 14) greeting = '中午好，饭后喝点水';
    else if (hour < 18) greeting = '下午好，补水提神';
    else if (hour < 22) greeting = '晚上好，放松一下';
    else greeting = '夜深了，早点睡吧';
    
    // 动态设置 navigationBarTitle
    wx.setNavigationBarTitle({
      title: greeting
    });
  },

  loadTodayRecord() {
    wx.showLoading({ title: '加载中...' });
    wx.cloud.callFunction({
      name: 'getTodayRecord'
    }).then(res => {
      wx.hideLoading();
      if (res.result.success) {
        const total = res.result.data.totalAmount;
        const consecutiveDays = res.result.data.consecutiveDays || 0;
        console.log('今日已喝水:', total);
        console.log('连续打卡天数:', consecutiveDays);
        this.setData({ consecutiveDays });
        this.updateProgress(total);
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('加载记录失败', err);
      // 降级使用本地缓存
      const today = wx.getStorageSync('today_water') || 0;
      const consecutiveDays = wx.getStorageSync('consecutive_days') || 0;
      this.setData({ consecutiveDays });
      this.updateProgress(today);
    });
  },

  addWater(e) {
    console.log('[addWater] guideStep:', this.data.guideStep);
    
    if (this.isSubmitting) return; // 防止重复点击
    const amount = parseInt(e.currentTarget.dataset.amount);

    // 新手引导模式：模拟加水（不保存数据）
    if (this.data.guideStep === 4) {
      console.log('[addWater] Step 4 - 触发模拟喝水');
      // 关闭 Step 4 的提示弹窗
      this.setData({ showGuideOverlay: false });
      this.simulateAddWater(amount);
      return;
    }

    this.promptAddWater(amount);
  },
  
  // 模拟加水（不记录数据，仅演示）
  simulateAddWater(amount) {
    const startValue = this.data.currentWater;
    const endValue = startValue + amount;
    
    console.log('[simulateAddWater] Step 4 - 开始模拟喝水，amount:', amount);
    
    // 1. 动画演示
    this.animateValue(startValue, endValue, 1000);
    
    // 2. 成功提示
    wx.showToast({
      title: `棒！已喝水 ${amount}ml`,
      icon: 'success',
      duration: 2000
    });

    // 3. 延迟进入下一步
    setTimeout(() => {
      console.log('[simulateAddWater] setTimeout 触发，准备进入 Step 5');
      
      // 4. 恢复数据（不保存，重置为 0）
      this.setData({
        currentWater: startValue,
        percent: this.calculatePercent(startValue, this.data.dailyGoal)
      });

      // 5. 进入社交引导（保持导航栏隐藏）
      try {
        if (typeof this.getTabBar === 'function') {
          const tabBar = this.getTabBar();
          if (tabBar && typeof tabBar.setVisibility === 'function') {
            tabBar.setVisibility(true);
          }
        }
      } catch (e) {
        console.warn('[simulateAddWater] tabBar setVisibility failed:', e);
      }
      
      // 6. 显示社交引导弹窗（Step 5）
      this.showSocialGuide();
    }, 2000);
  },

  // 显示最终完成弹窗
  showFinalGuideDialog() {
    Dialog.alert({
      context: this,
      selector: '#van-dialog',
      title: '🎉 恭喜完成新手引导',
      message: '刚才的记录仅供演示，数据已为您重置。\n现在，开启您的正式补水之旅吧！',
      confirmButtonText: '开始补水',
      theme: 'round-button',
      confirmButtonColor: '#00B0FF',
      closeOnClickOverlay: false,
      zIndex: 10000
    }).then(() => {
      this.finishGuide();
    });
  },

  calculatePercent(current, goal) {
    let percent = 0;
    if (current >= goal) {
      percent = 100;
    } else {
      percent = Math.max(0, Math.min(100, Math.round((current / goal) * 100)));
    }
    return percent;
  },

  promptAddWater(amount) {
    // 改为显示底部 Popup
    this.setData({
      showConfirmPopup: true,
      pendingAmount: amount
    });
  },

  onCancelAdd() {
    this.setData({ showConfirmPopup: false });
  },

  onConfirmAdd() {
    this.setData({ showConfirmPopup: false });
    const amount = this.data.pendingAmount;
    
    this.isSubmitting = true; // 加锁
    wx.showLoading({ title: '记录中...', mask: true });
    this.executeAddWater(amount);
  },

  executeAddWater(amount) {
    const startValue = this.data.currentWater;
    const endValue = startValue + amount;
    
    // 动画效果：逐步增加数值
    this.animateValue(startValue, endValue, 1000);
    
    // 保存数据
    wx.setStorageSync('today_water', endValue);
    
    // 调用云函数上传数据
    wx.cloud.callFunction({
      name: 'createRecord',
      data: {
        amount: amount
      }
    }).then(res => {
      console.log('[云函数] createRecord 结果:', res);
      wx.hideLoading(); // 隐藏 loading
      
      if (res.result && res.result.success) {
        // 成功提示
        wx.showToast({
          title: `已喝水 ${amount}ml`,
          icon: 'success',
          duration: 1500
        });

        // 更新本地缓存作为备份
        wx.setStorageSync('today_water', endValue);

        // 检查是否有打卡成功或升级
        const { isTargetReached, titleUpgraded, newTitle, totalAmount, dailyGoal, consecutiveDays } = res.result.data;
        if (typeof dailyGoal === 'number') {
          this.setData({ dailyGoal });
        }
        if (typeof totalAmount === 'number') {
          this.updateProgress(totalAmount);
        }
        if (isTargetReached) {
          const shouldCelebrate = !!titleUpgraded || Number(consecutiveDays) === 7;
          
          this.setData({ isSystemDialogShowing: true });

          if (shouldCelebrate) {
            Dialog.alert({
              title: '🎉 打卡成功',
              message: titleUpgraded ? `称号升级：${newTitle}` : '连续 7 天达标，太强了！',
              theme: 'round-button',
              confirmButtonText: '打开海报',
              messageAlign: 'center',
              className: 'celebrate-dialog' // 添加自定义样式类
            }).then(() => {
              this.setData({ isSystemDialogShowing: false });
              const titleParam = titleUpgraded ? encodeURIComponent(newTitle || '') : '';
              wx.navigateTo({
                url: `/pages/celebrate/celebrate?days=${Number(consecutiveDays) || 0}&goal=${Number(dailyGoal) || 2000}&title=${titleParam}`
              });
            });
          } else {
            Dialog.alert({
              title: '🎉 打卡成功',
              message: '恭喜你达成今日饮水目标！',
              theme: 'round-button',
              confirmButtonText: '退出',
              messageAlign: 'center',
              className: 'celebrate-dialog' // 添加自定义样式类
            }).then(() => {
              this.setData({ isSystemDialogShowing: false });
            });
          }
        }
      } else {
        console.error('业务逻辑报错:', res.result);
        wx.showToast({
          title: res.result ? res.result.message : '同步失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('云函数调用失败:', err);
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    }).finally(() => {
      this.isSubmitting = false; // 解锁
    });
  },

  animateValue(start, end, duration) {
    const range = end - start;
    let current = start;
    const increment = end > start ? Math.ceil(range / (duration / 20)) : -1; 
    // 简单的帧动画模拟
    const step = () => {
      current += increment;
      if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
        current = end;
        this.updateProgress(current);
      } else {
        this.updateProgress(current);
        setTimeout(step, 20);
      }
    };
    step();
  },

  updateProgress(val) {
    const dailyGoal = Number(this.data.dailyGoal) || 2000;
    const currentWater = Number(val) || 0;
    let percent = 0;
    if (currentWater >= dailyGoal) {
      percent = 100;
    } else {
      percent = Math.max(0, Math.min(100, Math.round((currentWater / dailyGoal) * 100)));
    }
    
    this.setData({
      currentWater: currentWater,
      percent: percent
    });
  },

  // 显示推荐弹窗
  showRecommendDialog() {
    this.setData({ 
      showRecommendDialog: true, 
      weight: '', 
      occupation: 'office',
      recommendGoal: 0,
      activeGoalTab: 0,
      customGoalInput: this.data.dailyGoal,
      goalGuideSubStep: 0 // 重置为初始步骤
    });
  },

  // 选择目标设置模式
  selectGoalMode(e) {
    const mode = e.currentTarget.dataset.mode; // 'smart' or 'custom'

    if (mode === 'smart') {
      this.setData({ goalGuideSubStep: 1, activeGoalTab: 0 });
    } else {
      // 自定义模式：确保 customGoalInput 有默认值
      this.setData({ 
        goalGuideSubStep: 4, 
        activeGoalTab: 1,
        customGoalInput: this.data.customGoalInput || this.data.dailyGoal || 2000
      });
    }
  },

  // 智能引导下一步
  nextSmartStep() {
    const step = this.data.goalGuideSubStep;
    if (step === 1) {
      if (!this.data.weight || parseFloat(this.data.weight) <= 0) {
        wx.showToast({ title: '请输入体重', icon: 'none' });
        return;
      }
      this.setData({ goalGuideSubStep: 2 });
    } else if (step === 2) {
      this.calculateGoal();
      this.setData({ goalGuideSubStep: 3 });
    }
  },

  // 上一步
  prevSmartStep() {
    const step = this.data.goalGuideSubStep;
    if (step > 0) {
       // 如果是结果页 (3) 或自定义页 (4)，返回选择模式 (0)
       // 如果是职业页 (2)，返回体重页 (1)
       // 如果是体重页 (1)，返回选择模式 (0)
       if (step === 4 || step === 1) {
         this.setData({ goalGuideSubStep: 0 });
       } else {
         this.setData({ goalGuideSubStep: step - 1 });
       }
    }
  },

  onGoalTabChange(e) {
    this.setData({ activeGoalTab: e.detail.name });
  },

  onCustomGoalInputChange(e) {
    this.setData({ customGoalInput: e.detail });
  },

  // 监听体重输入
  onWeightChange(e) {
    this.setData({ weight: e.detail });
    this.calculateGoal();
  },

  // 监听职业选择
  onOccupationChange(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ occupation: type });
    this.calculateGoal();
  },

  // 计算推荐目标
  calculateGoal() {
    const weight = parseFloat(this.data.weight);
    if (weight > 0) {
      let factor = 35; // 默认：脑力/办公
      switch (this.data.occupation) {
        case 'light': // 轻体力
          factor = 40;
          break;
        case 'heavy': // 重体力/运动
          factor = 45;
          break;
        default:
          factor = 35;
      }
      
      const goal = Math.floor(weight * factor / 50) * 50; // 取 50 的倍数
      this.setData({ recommendGoal: goal });
    } else {
      this.setData({ recommendGoal: 0 });
    }
  },

  // 确认更新目标
  confirmRecommend() {
    let finalGoal = 0;
    if (this.data.activeGoalTab === 0) {
      // 智能推荐模式
      if (this.data.recommendGoal > 0) {
        finalGoal = this.data.recommendGoal;
      }
    } else {
      // 自定义模式
      const goal = parseInt(this.data.customGoalInput);
      if (goal > 0) {
        finalGoal = goal;
      } else {
        wx.showToast({ title: '请输入有效目标', icon: 'none' });
        return; // 阻止后续逻辑
      }
    }

    if (finalGoal > 0) {
      // 如果处于新手引导模式
      if (this.data.guideStep === 2) {
        // 仅模拟更新本地数据，不调用云函数
        this.setData({
          dailyGoal: finalGoal
        });
        this.updateProgress(this.data.currentWater);
        
        // 进入下一步（提醒）
        this.askForNotification();
      } else {
        // 正常模式：调用云函数真实更新
        this.updateDailyGoal(finalGoal);
      }
    } else if (this.data.activeGoalTab === 0 && this.data.recommendGoal === 0) {
      // 智能推荐模式下，如果还没输入体重/职业，提示用户
      wx.showToast({ title: '请输入体重并选择职业', icon: 'none' });
    }
    // 自定义模式下 finalGoal 为 0 的情况已在上面 return，不会执行到这里
  },

  // 询问开启提醒 (引导 Step 3)
  askForNotification() {
    console.log('[askForNotification] 进入 Step 3');
    this.data.isSwitchingStep = true; // 标记正在切换
    this.setData({ 
      showRecommendDialog: false,
      guideStep: 3
    });
    
    setTimeout(() => {
      console.log('[askForNotification] setTimeout 触发，准备显示 Dialog');
      // 引导期间隐藏导航栏
      try { if (typeof this.getTabBar === 'function') { const tabBar = this.getTabBar(); if (tabBar && typeof tabBar.setVisibility === 'function') { tabBar.setVisibility(true); } } } catch (e) { console.warn('[tabBar] setVisibility failed:', e); }
      
      Dialog.confirm({
        title: '开启喝水提醒',
        message: '好记性不如烂笔头，允许我们定时提醒您喝水吗？',
        confirmButtonText: '开启提醒',
        cancelButtonText: '暂不开启',
        zIndex: 2000,
        closeOnClickOverlay: false
      }).then(() => {
        console.log('[askForNotification] 用户点击开启');
        // 用户同意开启
        const TEMPLATE_ID = 'fZemoZCO7WILweXS6gV9n8bbp24bN1uH1h5Vu24-pjo';
        wx.requestSubscribeMessage({
          tmplIds: [TEMPLATE_ID],
          success: (res) => {
            if (res[TEMPLATE_ID] === 'accept') {
              wx.showToast({ title: '提醒已开启' });
              // 更新设置
              const settings = wx.getStorageSync('user_settings') || {};
              settings.subscribeEnabled = true;
              wx.setStorageSync('user_settings', settings);
            }
          },
          complete: () => {
            console.log('[askForNotification] requestSubscribeMessage complete，调用 nextGuideStep');
            // 进入下一步：记录喝水
            this.nextGuideStep();
          }
        });
      }).catch(() => {
        console.log('[askForNotification] 用户取消，调用 nextGuideStep');
        // 用户拒绝，也进入下一步
        this.nextGuideStep();
      });
    }, 300);
  },

  // 开始操作指引 (引导 Step 4)
  startGuideAction() {
    console.log('[startGuideAction] 进入 Step 4 - 操作指引');
    this.setData({ 
      guideStep: 4,
      showGuideOverlay: true,
      isSystemDialogShowing: false
    });
  },

  // 阻止遮罩层触摸移动
  preventTouchMove() {
    // 空方法，阻止默认行为
  },

  onCloseDialog() {
    // 如果是步骤切换导致的关闭，直接忽略
    if (this.data.isSwitchingStep) {
      this.data.isSwitchingStep = false; // 重置标志位
      return;
    }

    // 如果是引导中的任意一步被强制关闭（点击遮罩等），直接跳过剩余步骤
    // 但为了体验，尽量只在非引导状态下完全重置
    if (this.data.guideStep > 0) {
       // 引导中关闭了弹窗，视为跳过引导
       this.finishGuide();
    }
    
    this.setData({ 
      showRecommendDialog: false,
      showWelcomeDialog: false,
      showSocialGuideDialog: false,
      isSystemDialogShowing: false
    });
  },

  // 调用云函数更新目标
  updateDailyGoal(goal) {
    wx.showLoading({ title: '更新中...' });
    wx.cloud.callFunction({
      name: 'updateUserInfo',
      data: {
        daily_goal: goal
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result.success) {
        this.setData({
          dailyGoal: goal
        });
        // 重新计算进度
        this.updateProgress(this.data.currentWater);
        
        if (app.globalData) app.globalData.dailyGoal = goal; // 同步全局
        wx.showToast({ title: '目标已更新', icon: 'success' });
      } else {
        wx.showToast({ title: '更新失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error(err);
      wx.showToast({ title: '网络错误', icon: 'none' });
    });
  },

  // ========== 通知中心相关方法 ==========

  onCustomWater() {
    this.setData({ showCustomDialog: true, customAmount: '' });
  },

  onCustomAmountChange(e) {
    this.setData({ customAmount: e.detail });
  },

  onConfirmCustom() {
    const amount = parseInt(this.data.customAmount);
    if (amount > 0) {
      this.promptAddWater(amount);
    }
  },

  onCloseCustom() {
    this.setData({ showCustomDialog: false });
  },

  toggleCupGuide() {
    this.setData({ showCupGuide: !this.data.showCupGuide });
  },

  onSelectCup(e) {
    const amount = e.currentTarget.dataset.volume;
    this.setData({ showCupGuide: false });
    this.promptAddWater(amount);
  },

  // ========== 通知中心相关方法 ==========

  toggleNotificationPanel() {
    const show = !this.data.showNotificationPanel;
    this.setData({ showNotificationPanel: show });
    if (show) {
      this.markAllAsRead();
    }
  },

  markAllAsRead() {
    const notices = this.data.notices.map(n => ({ ...n, read: true }));
    this.setData({ notices, hasUnreadNotice: false });
    wx.setStorageSync('notices', notices);
  },

  clearAllNotices() {
    this.setData({ notices: [], hasUnreadNotice: false });
    wx.setStorageSync('notices', []);
  },

  onNoticeTap(e) {
    const item = e.currentTarget.dataset.item;
    if (item.type === 'invite') {
      wx.switchTab({ url: '/pages/social/social' });
    } else if (item.url) {
      wx.navigateTo({ url: item.url });
    }
    const notices = this.data.notices.map(n => n.id === item.id ? { ...n, read: true } : n);
    this.setData({ notices, hasUnreadNotice: notices.some(n => !n.read) });
    wx.setStorageSync('notices', notices);
  },

  addNotice(type, title, desc) {
    const notices = this.data.notices;
    const newNotice = {
      id: Date.now(),
      type,
      title,
      desc,
      icon: this.noticeIcons[type] || 'info-o',
      time: this.formatNoticeTime(new Date()),
      read: false
    };
    notices.unshift(newNotice);
    this.setData({ notices, hasUnreadNotice: true });
    wx.setStorageSync('notices', notices);
  },

  formatNoticeTime(date) {
    const diff = new Date() - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return minutes + '分钟前';
    if (hours < 24) return hours + '小时前';
    if (days < 7) return days + '天前';
    return (date.getMonth() + 1) + '月' + date.getDate() + '日';
  },

  loadNotices() {
    const notices = wx.getStorageSync('notices') || [];
    this.setData({ notices, hasUnreadNotice: notices.some(n => !n.read) });
  },
  
  noticeIcons: {
    'invite': 'friends-o',
    'welfare': 'gift-o',
    'notice': 'bullhorn-o',
    'system': 'setting-o'
  },

  // 启动新手引导流程
  startNewUserGuide() {
    // 隐藏底部 tabBar
    try {
      if (typeof this.getTabBar === 'function') {
        const tabBar = this.getTabBar();
        if (tabBar && typeof tabBar.setVisibility === 'function') {
          tabBar.setVisibility(true);
        }
      }
    } catch (e) {
      console.warn('[startNewUserGuide] tabBar setVisibility failed:', e);
    }

    // 设置引导状态
    this.setData({
      showGuideOverlay: true,
      guideStep: 1,
      showWelcomeDialog: true,
      isSystemDialogShowing: true
    });
    
    console.log('[startNewUserGuide] Guide started');
  }
});
