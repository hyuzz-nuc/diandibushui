const app = getApp();

// 商品配置
const SHOP_ITEMS = {
  ring: [
    { name: '清新蓝', icon: '⭕', price: 0, previewClass: '', unlockLevel: 1 },
    { name: '活力橙', icon: '⭕', price: 200, previewClass: 'ring-orange', unlockLevel: 1 },
    { name: '薄荷绿', icon: '⭕', price: 200, previewClass: 'ring-green', unlockLevel: 1 },
    { name: '梦幻紫', icon: '⭕', price: 300, previewClass: 'ring-purple', unlockLevel: 1 },
    { name: '少女粉', icon: '⭕', price: 300, previewClass: 'ring-pink', unlockLevel: 1 },
    { name: '星空黑', icon: '⭕', price: 500, previewClass: 'ring-black', unlockLevel: 1 },
    { name: '彩虹色', icon: '⭕', price: 800, previewClass: 'ring-rainbow', unlockLevel: 1 }
  ],
  button: [
    { name: '经典蓝', icon: '🔘', price: 0, previewClass: '', unlockLevel: 1 },
    { name: '活力橙', icon: '🔘', price: 150, previewClass: 'ring-orange', unlockLevel: 1 },
    { name: '薄荷绿', icon: '🔘', price: 150, previewClass: 'ring-green', unlockLevel: 1 },
    { name: '梦幻紫', icon: '🔘', price: 250, previewClass: 'ring-purple', unlockLevel: 1 },
    { name: '少女粉', icon: '🔘', price: 250, previewClass: 'ring-pink', unlockLevel: 1 },
    { name: '金色奢华', icon: '🔘', price: 400, previewClass: 'ring-black', unlockLevel: 1 }
  ],
  effect: [
    { name: '水波纹', icon: '✨', price: 0, previewClass: '', unlockLevel: 1 },
    { name: '星光闪烁', icon: '✨', price: 300, previewClass: 'ring-purple', unlockLevel: 1 },
    { name: '樱花飘落', icon: '✨', price: 300, previewClass: 'ring-pink', unlockLevel: 1 },
    { name: '烟花绽放', icon: '✨', price: 500, previewClass: 'ring-orange', unlockLevel: 1 },
    { name: '极光流动', icon: '✨', price: 600, previewClass: 'ring-rainbow', unlockLevel: 1 }
  ],
  frame: [
    { name: '简约白', icon: '🖼️', price: 0, previewClass: '', unlockLevel: 1 },
    { name: '清新蓝', icon: '🖼️', price: 200, previewClass: '', unlockLevel: 1 },
    { name: '活力橙', icon: '🖼️', price: 300, previewClass: 'ring-orange', unlockLevel: 2 },
    { name: '薄荷绿', icon: '🖼️', price: 300, previewClass: 'ring-green', unlockLevel: 2 },
    { name: '梦幻紫', icon: '🖼️', price: 400, previewClass: 'ring-purple', unlockLevel: 3 },
    { name: '金色荣耀', icon: '🖼️', price: 600, previewClass: 'ring-black', unlockLevel: 4 },
    { name: '钻石闪耀', icon: '🖼️', price: 800, previewClass: 'ring-rainbow', unlockLevel: 5 },
    { name: '传奇之框', icon: '🖼️', price: 1000, previewClass: 'ring-rainbow', unlockLevel: 6 }
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

      if (ownedInfo && ownedInfo.expireAt) {
        const expireDate = new Date(ownedInfo.expireAt);
        if (expireDate > now) {
          isOwned = true;
          remainDays = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24));
        } else {
          isExpired = true;
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
