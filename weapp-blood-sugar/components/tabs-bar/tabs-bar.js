/**
 * 底部导航栏组件
 * 作品集演示 · 血糖数据监测系统
 */
Component({
  properties: {
    activeIdx: { type: Number, value: 0 }
  },
  data: {},
  methods: {
    onTabTap(e) {
      const idx = e.currentTarget.dataset.idx
      this.triggerEvent('tabchange', { index: idx })
    }
  }
})
