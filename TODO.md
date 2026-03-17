# 点滴补水 - 开发任务清单

## 已完成 ✅
- [x] 修复新手引导 Step 4 遮罩层高亮按钮问题
- [x] 修复打卡完成弹窗按钮文字颜色
- [x] 移除原生导航栏，使用自定义 header
- [x] 添加重新开始新手引导功能

---

## 待开发 📋

### Task 1: 主页整体下移，解决刘海屏遮挡
**优先级：** P0 - 最高
**文件：** `pages/index/index.wxss`
**改动：**
- `.header` 添加 `padding-top` 或 `margin-top`
- 考虑安全区域 `env(safe-area-inset-top)`
**预计耗时：** 10 分钟

---

### Task 2: 重新进入引导 - 友好提示 + 重启选项
**优先级：** P0
**文件：** `pages/settings/settings.js`, `pages/index/index.js`
**改动：**
1. 清除引导标记后，显示 Dialog 提示
2. 两个按钮：「现在重启」和「稍后重启」
3. 「现在重启」调用 `wx.reLaunch({ url: '/pages/index/index' })`
4. 「稍后重启」提示「下次启动时将进入引导」
**预计耗时：** 30 分钟

---

### Task 3: 导航栏增加打卡天数提示 + 检查海报功能
**优先级：** P1
**文件：** `pages/index/index.wxml`, `pages/index/index.js`, `pages/index/index.wxss`
**改动：**
1. 在 greeting 上方添加小字提示
2. 从云函数/本地缓存读取 `consecutiveDays`
3. 显示「连续打卡 X 天，再坚持 Y 天解锁海报」
4. 检查 `pages/celebrate/celebrate.wxml` 海报功能是否完整
**预计耗时：** 40 分钟

---

### Task 4: 检查海报功能完整性
**优先级：** P1
**文件：** `pages/celebrate/celebrate.js`, `celebrate.wxml`
**检查项：**
- [ ] `onSavePoster()` 方法是否存在
- [ ] canvas 绘制逻辑是否完整
- [ ] 海报图片是否可保存
**预计耗时：** 20 分钟

---

## 开发规范
- 每个任务独立提交
- 提交信息格式：`feat/fix: 任务名称`
- 完成后更新此清单

---
创建时间：2026-03-17
