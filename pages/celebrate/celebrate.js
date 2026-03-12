Page({
  data: {
    consecutiveDays: 0,
    dailyGoal: 2000,
    newTitle: '',
    tipText: '继续保持，明天也别忘了喝水～'
  },

  onLoad(options) {
    const consecutiveDays = Number(options && options.days) || 0
    const dailyGoal = Number(options && options.goal) || 2000
    const newTitle = options && options.title ? decodeURIComponent(options.title) : ''
    const tipText = newTitle ? '这一波晋升很硬核，继续冲！' : '今天状态拉满，水到渠成～'
    this.setData({ consecutiveDays, dailyGoal, newTitle, tipText })
  },

  onShareAppMessage() {
    return {
      title: '我今天喝水打卡成功啦！一起来坚持～',
      path: '/pages/index/index'
    }
  },

  onBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    });
  },

  async onSavePoster() {
    wx.showLoading({ title: '生成中...' })
    try {
      await this.drawPoster()
      const tempPath = await this.exportPoster()
      await this.saveToAlbum(tempPath)
      wx.hideLoading()
      wx.showToast({ title: '已保存到相册' })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  drawPoster() {
    return new Promise(resolve => {
      const query = wx.createSelectorQuery().in(this);
      query.select('#poster')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) {
            return resolve();
          }

          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = wx.getSystemInfoSync().pixelRatio;

          // 设定画布物理尺寸（基于 DPR）
          const width = 600;
          const height = 900;
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          ctx.scale(dpr, dpr);

          // 绘制圆角矩形辅助函数（Canvas 2D 原生没有 roundRect 兼容性不好，手写）
          const fillRoundRect = (x, y, w, h, r, color) => {
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.arcTo(x + w, y, x + w, y + r, r);
            ctx.lineTo(x + w, y + h - r);
            ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
            ctx.lineTo(x + r, y + h);
            ctx.arcTo(x, y + h, x, y + h - r, r);
            ctx.lineTo(x, y + r);
            ctx.arcTo(x, y, x + r, y, r);
            ctx.closePath();
            ctx.fill();
          };

          // 1. 绘制背景渐变
          const grd = ctx.createLinearGradient(0, 0, 0, height);
          grd.addColorStop(0, '#E3F7FF');
          grd.addColorStop(1, '#FFFFFF');
          ctx.fillStyle = grd;
          ctx.fillRect(0, 0, width, height);

          // 2. 绘制气泡装饰
          const bubble = ctx.createRadialGradient(180, 160, 20, 180, 160, 260);
          bubble.addColorStop(0, 'rgba(79,195,247,0.65)');
          bubble.addColorStop(1, 'rgba(0,176,255,0)');
          ctx.fillStyle = bubble;
          ctx.beginPath();
          ctx.arc(180, 160, 260, 0, Math.PI * 2);
          ctx.fill();

          // 3. 绘制文字：标题
          ctx.fillStyle = '#0b2a3a';
          ctx.font = 'bold 34px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText('点滴补水', 48, 110);

          ctx.fillStyle = '#0b2a3a';
          ctx.font = 'bold 46px sans-serif';
          ctx.fillText('今日打卡成功', 48, 190);

          ctx.fillStyle = '#6b8897';
          ctx.font = '24px sans-serif';
          ctx.fillText('喝水也要有仪式感', 48, 235);

          // 4. 绘制数据卡片
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 10;
          ctx.shadowBlur = 18;
          ctx.shadowColor = 'rgba(0,176,255,0.22)';
          fillRoundRect(48, 280, 504, 180, 22, '#ffffff');
          // 重置阴影
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'rgba(0,0,0,0)';

          // 5. 绘制卡片内数据
          ctx.textAlign = 'center';
          
          // 连续天数
          ctx.fillStyle = '#00B0FF';
          ctx.font = 'bold 54px sans-serif';
          ctx.fillText(String(this.data.consecutiveDays), 180, 372);
          ctx.fillStyle = '#6b8897';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText('连续(天)', 180, 404);

          // 目标
          ctx.fillStyle = '#00B0FF';
          ctx.font = 'bold 54px sans-serif';
          ctx.fillText(String(this.data.dailyGoal), 420, 372);
          ctx.fillStyle = '#6b8897';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText('目标(ml)', 420, 404);

          // 6. 称号升级（如有）
          if (this.data.newTitle) {
            const titleGrd = ctx.createLinearGradient(0, 0, 0, 110);
            titleGrd.addColorStop(0, 'rgba(255,249,196,0.9)');
            titleGrd.addColorStop(1, 'rgba(255,249,196,0.35)');
            
            // 保存状态以绘制特定位置的阴影或特效
            ctx.save();
            fillRoundRect(48, 490, 504, 120, 22, titleGrd);
            ctx.restore();

            ctx.textAlign = 'left';
            ctx.fillStyle = '#9a7b09';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText('称号升级', 72, 535);

            ctx.fillStyle = '#c49000';
            ctx.font = 'bold 42px sans-serif';
            ctx.fillText(`「${this.data.newTitle}」`, 72, 595);
          }

          // 7. 底部文案
          ctx.textAlign = 'left';
          ctx.fillStyle = '#6b8897';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText(this.data.tipText, 48, 700);

          ctx.fillStyle = '#c8d6de';
          ctx.font = '20px sans-serif';
          ctx.fillText('打开小程序，一起喝水打卡', 48, 820);

          // 8. 绘制二维码（模拟）
          const qrX = 480;
          const qrY = 790;
          const qrSize = 90;

          // 阴影
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 4;
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'rgba(0,0,0,0.05)';
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(qrX, qrY, qrSize, qrSize);
          ctx.shadowColor = 'rgba(0,0,0,0)'; // Reset

          // 占位色块
          ctx.fillStyle = '#E1F5FE';
          ctx.fillRect(qrX + 5, qrY + 5, qrSize - 10, qrSize - 10);

          ctx.fillStyle = '#00B0FF';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('小程序码', qrX + qrSize / 2, qrY + qrSize / 2 + 4);

          // Canvas 2D 不需要 draw()，执行完即渲染
          // 稍微延迟一下确保渲染完成
          setTimeout(() => {
            resolve(canvas); // 返回 canvas 对象供导出使用
          }, 100);
        });
    });
  },

  exportPoster() {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery().in(this);
      query.select('#poster')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) {
            reject(new Error('Canvas not found'));
            return;
          }
          const canvas = res[0].node;
          wx.canvasToTempFilePath({
            canvas: canvas, // 传入 canvas 2d 实例
            destWidth: 1200,
            destHeight: 1800,
            success: res => resolve(res.tempFilePath),
            fail: err => reject(err)
          });
        });
    });
  },

  saveToAlbum(filePath) {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: setting => {
          if (setting.authSetting['scope.writePhotosAlbum'] === false) {
            wx.openSetting({
              success: () => {},
              fail: () => {}
            })
            reject(new Error('no auth'))
            return
          }
          wx.authorize({
            scope: 'scope.writePhotosAlbum',
            success: () => {
              wx.saveImageToPhotosAlbum({
                filePath,
                success: () => resolve(),
                fail: err => reject(err)
              })
            },
            fail: () => {
              wx.saveImageToPhotosAlbum({
                filePath,
                success: () => resolve(),
                fail: err => reject(err)
              })
            }
          })
        },
        fail: err => reject(err)
      })
    })
  }
})
