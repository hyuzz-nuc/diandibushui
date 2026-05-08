const app = getApp();
import Dialog from '@vant/weapp/dialog/dialog';

Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: '',
      current_title: '饮水萌新',
      consecutive_days: 0,
      total_days: 0,
      daily_goal: 2000
    },
    hasUserInfo: false,
    showInvitePopup: false,
    showLoginPopup: false, // 登录弹窗
    loginAvatarUrl: '', // 登录弹窗中的临时头像
    loginNickName: '', // 登录弹窗中的临时昵称
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
    this.loadUserInfo();

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        active: 3 // 我的页
      })
    }
  },

  loadUserInfo() {
    // 优先从全局数据获取
    if (app.globalData.userInfo && app.globalData.userInfo.nickName) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      });
    } else {
      // 否则尝试从云端拉取
      wx.cloud.callFunction({
        name: 'login'
      }).then(res => {
        if (res.result.userInfo && res.result.userInfo.nickName) {
          app.globalData.userInfo = res.result.userInfo;
          this.setData({
            userInfo: res.result.userInfo,
            hasUserInfo: true
          });
        } else {
          // 用户未设置昵称，视为未登录
          this.setData({
            userInfo: res.result.userInfo || this.data.userInfo,
            hasUserInfo: false
          });
        }
      });
    }
  },

  // 点击登录按钮
  onTapLogin() {
    this.setData({
      showLoginPopup: true,
      loginAvatarUrl: '',
      loginNickName: ''
    });
  },

  // 登录弹窗中选择头像
  onChooseLoginAvatar(e) {
    const avatarUrl = e.detail.avatarUrl;
    this.setData({ loginAvatarUrl: avatarUrl });
  },

  // 登录弹窗中输入昵称
  onLoginNickNameChange(e) {
    this.setData({ loginNickName: e.detail.value });
  },

  // 确认登录
  onConfirmLogin() {
    if (!this.data.loginNickName) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '登录中...' });

    // 如果选择了微信头像，需要上传到云存储
    const uploadPromise = this.data.loginAvatarUrl
      ? this.uploadLoginAvatar(this.data.loginAvatarUrl)
      : Promise.resolve('');

    uploadPromise.then(avatarUrl => {
      // 调用云函数更新用户信息
      wx.cloud.callFunction({
        name: 'updateUserInfo',
        data: {
          avatarUrl: avatarUrl,
          nickName: this.data.loginNickName
        }
      }).then(res => {
        wx.hideLoading();
        if (res.result.success) {
          const userInfo = res.result.userInfo || {
            avatarUrl: avatarUrl,
            nickName: this.data.loginNickName,
            ...this.data.userInfo
          };

          // 更新全局和本地数据
          app.globalData.userInfo = userInfo;
          this.setData({
            userInfo: userInfo,
            hasUserInfo: true,
            showLoginPopup: false
          });

          wx.showToast({ title: '登录成功', icon: 'success' });
        } else {
          wx.showToast({ title: '登录失败', icon: 'none' });
        }
      }).catch(err => {
        wx.hideLoading();
        console.error(err);
        wx.showToast({ title: '网络错误', icon: 'none' });
      });
    }).catch(err => {
      wx.hideLoading();
      console.error('头像上传失败:', err);
      wx.showToast({ title: '头像上传失败', icon: 'none' });
    });
  },

  // 上传登录头像
  uploadLoginAvatar(filePath) {
    return new Promise((resolve, reject) => {
      const cloudPath = `avatars/${app.globalData.openid}_${Date.now()}.jpg`;
      wx.cloud.uploadFile({
        cloudPath,
        filePath,
        success: res => {
          wx.cloud.getTempFileURL({
            fileList: [res.fileID],
            success: tempRes => {
              if (tempRes.fileList && tempRes.fileList[0] && tempRes.fileList[0].tempFileURL) {
                resolve(tempRes.fileList[0].tempFileURL);
              } else {
                reject(new Error('获取链接失败'));
              }
            },
            fail: reject
          });
        },
        fail: reject
      });
    });
  },

  // 关闭登录弹窗
  onCloseLoginPopup() {
    this.setData({ showLoginPopup: false });
  },

  onPickAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera']
    }).then(res => {
      const tempFilePath = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath;
      if (!tempFilePath) return;

      // 使用微信内置的图片编辑功能，支持裁剪
      wx.editImage({
        src: tempFilePath,
        success: (editRes) => {
          // 用户完成编辑后，上传裁剪后的图片
          this.uploadAvatar(editRes.tempFilePath);
        },
        fail: (err) => {
          // 用户取消编辑，使用原图
          if (err.errMsg && err.errMsg.includes('cancel')) {
            console.log('用户取消编辑，使用原图');
            this.uploadAvatar(tempFilePath);
          } else {
            console.error('编辑图片失败:', err);
            // 编辑失败也使用原图
            this.uploadAvatar(tempFilePath);
          }
        }
      });
    }).catch(() => {});
  },

  uploadAvatar(filePath) {
    wx.showLoading({ title: '上传头像中...' });
    const cloudPath = `avatars/${app.globalData.openid}_${Date.now()}.jpg`;
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: res => {
        const fileID = res.fileID; // cloud:// 格式的文件 ID

        // 获取永久访问链接（公有读配置后，链接永久有效）
        wx.cloud.getTempFileURL({
          fileList: [fileID],
          success: tempRes => {
            if (tempRes.fileList && tempRes.fileList[0] && tempRes.fileList[0].tempFileURL) {
              const httpUrl = tempRes.fileList[0].tempFileURL;

              this.setData({
                'userInfo.avatarUrl': httpUrl
              });

              wx.setStorageSync('avatarUrl', httpUrl);

              // 存储永久链接
              this.saveUserInfoToCloud(httpUrl);

              wx.hideLoading();
              wx.showToast({ title: '头像更新成功', icon: 'success' });
            } else {
              wx.hideLoading();
              wx.showToast({ title: '头像保存失败', icon: 'none' });
            }
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '获取链接失败', icon: 'none' });
          }
        });
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    });
  },
  
  saveUserInfoToCloud(avatarUrl) {
    const nickName = this.data.userInfo.nickName;
    wx.cloud.callFunction({
      name: 'updateUserInfo',
      data: {
        avatarUrl: avatarUrl,
        nickName: nickName
      }
    }).then(res => {
      if (res.result.success && res.result.userInfo) {
        // 更新全局数据
        app.globalData.userInfo = res.result.userInfo;
        console.log('[saveUserInfoToCloud] 全局数据已更新');
      }
    }).catch(console.error);
  },

  onInputChange(e) {
    const nickName = e.detail.value;
    this.setData({
      'userInfo.nickName': nickName
    });
  },

  saveUserInfo() {
    if (!this.data.userInfo.nickName) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    wx.cloud.callFunction({
      name: 'updateUserInfo',
      data: {
        avatarUrl: this.data.userInfo.avatarUrl,
        nickName: this.data.userInfo.nickName
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result.success) {
        wx.showToast({ title: '保存成功' });
        // 更新全局数据（使用服务器返回的最新数据）
        if (res.result.userInfo) {
          app.globalData.userInfo = res.result.userInfo;
          this.setData({
            userInfo: res.result.userInfo
          });
        } else {
          app.globalData.userInfo = this.data.userInfo;
        }
      } else {
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error(err);
      wx.showToast({ title: '网络错误', icon: 'none' });
    });
  },

  onInviteFriend() {
    this.setData({ showInvitePopup: true });
  },

  onCloseInvite() {
    this.setData({ showInvitePopup: false });
  },

  onViewPoster() {
    const { consecutive_days, daily_goal, current_title } = this.data.userInfo;
    // 构造跳转参数
    const days = Number(consecutive_days) || 0;
    const goal = Number(daily_goal) || 2000;
    const title = current_title ? encodeURIComponent(current_title) : '';
    
    wx.navigateTo({
      url: `/pages/celebrate/celebrate?days=${days}&goal=${goal}&title=${title}`
    });
  },

  restartGuide() {
    console.log('[restartGuide] 点击了重新进入引导');
    
    Dialog.confirm({
      title: '重新进入新手引导',
      message: '引导过程中的数据不会影响到您的实际记录，确认要重新开始吗？',
      confirmButtonText: '现在重启',
      cancelButtonText: '稍后重启',
      confirmButtonColor: '#00B0FF'
    }).then(() => {
      console.log('[restartGuide] 用户选择现在重启');
      // 用户选择「现在重启」
      wx.removeStorageSync('has_guided_v2');
      
      wx.showToast({
        title: '正在重启...',
        icon: 'none',
        duration: 1500
      });

      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/index/index'
        });
      }, 1500);
    }).catch(() => {
      console.log('[restartGuide] 用户选择稍后重启');
      // 用户选择「稍后重启」
      wx.removeStorageSync('has_guided_v2');
      
      Dialog.alert({
        title: '已设置',
        message: '下次启动小程序时将自动进入新手引导，敬请期待！',
        confirmButtonText: '好的',
        confirmButtonColor: '#00B0FF'
      });
    });
  },

  // 我的好友（跳转社交页）
  goToSocial() {
    wx.switchTab({
      url: '/pages/social/social'
    });
  },

  // 跳转到提醒中心
  goToReminder() {
    wx.navigateTo({
      url: '/pages/reminder/reminder'
    });
  },

  // 用户反馈（打开微信官方反馈页面）
  openFeedback() {
    // 使用小程序内置的反馈功能
    wx.showModal({
      title: '用户反馈',
      content: '如有问题或建议，欢迎反馈给我们！',
      confirmText: '去反馈',
      cancelText: '取消',
      confirmColor: '#00B0FF',
      success: (res) => {
        if (res.confirm) {
          // 打开微信官方反馈页面（需要在小程序后台配置）
          wx.openFeedback({
            type: 'general'
          });
        }
      }
    });
  },
  
  // 关于我们
  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: '点滴补水 - 你的健康喝水助手\n\n版本：1.0.0\n开发：点滴补水团队',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#00B0FF'
    });
  },
  
  onShareAppMessage() {
    return {
      title: '快来和我一起喝水打卡吧！',
      path: '/pages/index/index?inviteCode=' + (app.globalData.openid || '')
    }
  }
});
