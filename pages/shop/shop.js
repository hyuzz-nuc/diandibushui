const app = getApp();

// 商品配置
const SHOP_ITEMS = {
  ring: [
    { name: '天空之境', icon: '⭕', price: 0, previewClass: '', unlockLevel: 1 },
    { name: '落日余晖', icon: '⭕', price: 200, previewClass: 'ring-orange', unlockLevel: 2 },
    { name: '薄荷微风', icon: '⭕', price: 200, previewClass: 'ring-green', unlockLevel: 2 },
    { name: '紫霞仙子', icon: '⭕', price: 300, previewClass: 'ring-purple', unlockLevel: 3 },
    { name: '樱花物语', icon: '⭕', price: 300, previewClass: 'ring-pink', unlockLevel: 3 },
    { name: '暗夜星辰', icon: '⭕', price: 500, previewClass: 'ring-black', unlockLevel: 4 },
    { name: '极光幻梦', icon: '⭕', price: 800, previewClass: 'ring-rainbow', unlockLevel: 5 }
  ],
  button: [
    { name: '纯净之心', icon: '🔘', price: 0, previewClass: '', unlockLevel: 1 },
    { name: '暖阳轻抚', icon: '🔘', price: 150, previewClass: 'ring-orange', unlockLevel: 2 },
    { name: '森林呼吸', icon: '🔘', price: 150, previewClass: 'ring-green', unlockLevel: 2 },
    { name: '薰衣草田', icon: '🔘', price: 250, previewClass: 'ring-purple', unlockLevel: 3 },
    { name: '初恋悸动', icon: '🔘', price: 250, previewClass: 'ring-pink', unlockLevel: 3 },
    { name: '鎏金岁月', icon: '🔘', price: 400, previewClass: 'ring-gold', unlockLevel: 4 }
  ],
  effect: [
    { name: '涟漪轻漾', icon: '💧', desc: '水波扩散', price: 0, previewClass: '', unlockLevel: 1 },
    { name: '星河璀璨', icon: '✨', desc: '星光闪烁', price: 300, previewClass: 'ring-purple', unlockLevel: 2 },
    { name: '樱吹雪舞', icon: '🌸', desc: '樱花飘落', price: 300, previewClass: 'ring-pink', unlockLevel: 3 },
    { name: '烟火人间', icon: '🎆', desc: '烟花绽放', price: 500, previewClass: 'ring-orange', unlockLevel: 4 },
    { name: '极光流转', icon: '🌈', desc: '彩虹光效', price: 600, previewClass: 'ring-rainbow', unlockLevel: 5 }
  ],
  frame: [
    { name: '素雅时光', icon: '🖼️', price: 0, previewClass: '', unlockLevel: 1 },
    { name: '碧海蓝天', icon: '🖼️', price: 200, previewClass: 'ring-blue', unlockLevel: 2 },
    { name: '橙意满满', icon: '🖼️', price: 300, previewClass: 'ring-orange', unlockLevel: 3 },
    { name: '绿野仙踪', icon: '🖼️', price: 300, previewClass: 'ring-green', unlockLevel: 3 },
    { name: '紫气东来', icon: '🖼️', price: 400, previewClass: 'ring-purple', unlockLevel: 4 },
    { name: '荣耀金冠', icon: '🖼️', price: 600, previewClass: 'ring-gold', unlockLevel: 5 },
    { name: '钻石之心', icon: '🖼️', price: 800, previewClass: 'ring-diamond', unlockLevel: 6 },
    { name: '传奇荣耀', icon: '🖼️', price: 1000, previewClass: 'ring-legend', unlockLevel: 7 }
  ]
};

Page({
  data: {
    safeAreaTop: 110,
    coins: 0,
    level: 1,
    activeTab: 'ring',
    currentItems: [],
    ownedDecorations: {},
    showBuyPopup: false,
    selectedItem: null
  },

  onLoad() {
    this.setData({
      safeAreaTop: app.globalData.safeAreaTop || 110
    });
  },

  onShow() {
    this.loadShopData();
  },

  // 切换Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    this.updateCurrentItems();
  },

  // 加载商城数据
  loadShopData() {
    wx.cloud.callFunction({
      name: 'getShopData',
      success: res => {
        if (res.result && res.result.success) {
          const { coins, level, decorations } = res.result.data;
          this.setData({
            coins: coins || 0,
            level: level || 1,
            ownedDecorations: decorations || {}
          });
          this.updateCurrentItems();
        }
      },
      fail: err => {
        console.error('[getShopData] 加载失败:', err);
      }
    });
  },

  // 更新当前商品列表
  updateCurrentItems() {
    const items = SHOP_ITEMS[this.data.activeTab] || [];
    const owned = this.data.ownedDecorations[this.data.activeTab] || {};
    const now = new Date();

    const currentItems = items.map(item => {
      const ownedInfo = owned[item.name];
      let isOwned = false;
      let isExpired = false;
      let remainDays = 0;

      // 免费商品默认拥有
      if (item.price === 0) {
        isOwned = true;
        remainDays = -1; // 永久
      } else if (ownedInfo) {
        // 付费商品检查过期时间
        if (ownedInfo.permanent || !ownedInfo.expireAt) {
          isOwned = true;
          remainDays = -1;
        } else {
          const expireDate = new Date(ownedInfo.expireAt);
          if (expireDate > now) {
            isOwned = true;
            remainDays = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24));
          } else {
            isExpired = true;
          }
        }
      }

      const isLocked = item.unlockLevel > this.data.level;

      return {
        ...item,
        owned: isOwned,
        expired: isExpired,
        remainDays,
        locked: isLocked
      };
    });

    this.setData({ currentItems });
  },

  // 点击商品
  onItemTap(e) {
    const item = e.currentTarget.dataset.item;

    if (item.locked) {
      wx.showToast({ title: `需要 Lv.${item.unlockLevel} 解锁`, icon: 'none' });
      return;
    }

    // 免费商品已拥有则不弹窗
    if (item.price === 0 && item.owned) {
      wx.showToast({ title: '已拥有', icon: 'none' });
      return;
    }

    if (item.owned) {
      wx.showToast({ title: '已拥有', icon: 'none' });
      return;
    }

    this.setData({
      showBuyPopup: true,
      selectedItem: item
    });
  },

  // 关闭购买弹窗
  closeBuyPopup() {
    this.setData({ showBuyPopup: false });
  },

  // 确认购买
  confirmBuy() {
    const item = this.data.selectedItem;
    const price = item.price || 0;

    if (this.data.coins < price) {
      wx.showToast({ title: '金币不足', icon: 'none' });
      return;
    }

    wx.cloud.callFunction({
      name: 'buyShopItem',
      data: {
        type: this.data.activeTab,
        name: item.name,
        price: price
      },
      success: res => {
        if (res.result && res.result.success) {
          this.setData({ showBuyPopup: false });
          wx.showToast({ title: '购买成功', icon: 'success' });
          this.loadShopData();
        } else {
          wx.showToast({ title: res.result?.message || '购买失败', icon: 'none' });
        }
      },
      fail: err => {
        console.error('[buyShopItem] 失败:', err);
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  // 返回
  goBack() {
    wx.navigateBack();
  }
});
