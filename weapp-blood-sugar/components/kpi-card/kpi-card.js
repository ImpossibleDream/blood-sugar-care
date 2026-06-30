/**
 * KPI 指标卡片组件
 * 作品集演示 · 血糖数据监测系统
 */
Component({
  properties: {
    label: { type: String, value: '' },
    value: { type: String, value: '--' },
    change: { type: String, value: '' },
    color: { type: String, value: '' },
    flex: { type: String, value: '1' },
    minWidth: { type: String, value: '280rpx' }
  }
})
