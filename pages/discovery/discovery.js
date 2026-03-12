const { parse } = require('../../utils/markdown');

Page({
  data: {
    inputValue: '',
    loading: false,
    chatList: [], // { role: 'user'|'ai', content: string, html?: string }
    scrollIntoView: '',
    
    // 场景配置
    currentScene: 'basic',
    sceneOptions: [
      { text: '基础咨询', value: 'basic' },
      { text: '体质调理', value: 'constitution' },
      { text: '慢病康养', value: 'chronic' },
      { text: '四季养生', value: 'season' },
      { text: '职场养生', value: 'workplace' },
    ],

    // 风格配置
    currentStyle: 'detailed',
    styleOptions: [
      { text: '详细版', value: 'detailed' },
      { text: '精简版', value: 'concise' },
      { text: '科普版', value: 'popular' },
      { text: '方案版', value: 'plan' },
    ]
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        active: 0 // 发现页(AI对话)索引
      })
    }
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value });
  },

  onSceneChange(e) {
    this.setData({ currentScene: e.detail });
    this.addSystemMessage(`已切换到“${this.getSceneName(e.detail)}”模式`);
  },

  onStyleChange(e) {
    this.setData({ currentStyle: e.detail });
  },

  getSceneName(value) {
    const scene = this.data.sceneOptions.find(opt => opt.value === value);
    return scene ? scene.text : '基础咨询';
  },

  addSystemMessage(text) {
    const msg = { role: 'ai', content: text, html: parse(text) };
    this.setData({
      chatList: [...this.data.chatList, msg],
      scrollIntoView: `msg-${this.data.chatList.length}`
    });
  },

  async onSend() {
    const content = this.data.inputValue.trim();
    if (!content || this.data.loading) return;

    // 1. 添加用户消息
    const userMsg = { role: 'user', content };
    this.setData({
      chatList: [...this.data.chatList, userMsg],
      inputValue: '',
      loading: true,
      scrollIntoView: `msg-${this.data.chatList.length}`
    });

    try {
      // 2. 调用云函数
      const res = await wx.cloud.callFunction({
        name: 'chatAgent',
        data: {
          content,
          scene: this.data.currentScene,
          style: this.data.currentStyle,
          // 过滤历史消息，只保留 role 和 content，去除 html 等多余字段
          history: this.data.chatList
            .filter(msg => msg.role !== 'system')
            .map(msg => ({
              role: msg.role,
              content: msg.content
            }))
        }
      });

      if (res.result && res.result.success) {
        const aiContent = res.result.content;
        const aiMsg = {
          role: 'ai',
          content: aiContent,
          html: parse(aiContent)
        };
        this.setData({
          chatList: [...this.data.chatList, aiMsg],
          loading: false,
          scrollIntoView: `msg-${this.data.chatList.length + 1}` // +1 because of loading view removal
        });
        
        // 滚动到底部
        setTimeout(() => {
          this.setData({ scrollIntoView: 'bottom-anchor' });
        }, 100);

      } else {
        throw new Error(res.result.error || '请求失败');
      }

    } catch (err) {
      console.error(err);
      wx.showToast({ title: 'AI 响应超时，请重试', icon: 'none' });
      this.setData({ loading: false });
    }
  }
})