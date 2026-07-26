<template>
  <view class="sales-page">
    <!-- 日期范围 -->
    <view class="date-bar">
      <text class="date-label">时间范围</text>
      <picker mode="date" :value="startDate" @change="onStartChange">
        <text class="date-value">{{ startDate }}</text>
      </picker>
      <text class="date-sep">至</text>
      <picker mode="date" :value="endDate" @change="onEndChange">
        <text class="date-value">{{ endDate }}</text>
      </picker>
    </view>

    <!-- 销售概览 -->
    <view class="overview-grid">
      <view class="overview-card">
        <text class="overview-value">¥{{ totalSalesYuan }}</text>
        <text class="overview-label">销售额</text>
      </view>
      <view class="overview-card">
        <text class="overview-value">{{ totalOrders }}</text>
        <text class="overview-label">订单数</text>
      </view>
      <view class="overview-card">
        <text class="overview-value">¥{{ avgOrderYuan }}</text>
        <text class="overview-label">客单价</text>
      </view>
    </view>

    <!-- 趋势图（文字柱状图模拟） -->
    <view class="section">
      <view class="section-title">销售趋势</view>
      <view class="chart-area">
        <view class="bar-chart">
          <view class="bar-item" v-for="item in trendData" :key="item.label">
            <view class="bar-wrap">
              <view class="bar" :style="{ height: barHeight(item.value) }"></view>
            </view>
            <text class="bar-label">{{ item.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 热销排行 -->
    <view class="section">
      <view class="section-title">热销排行</view>
      <view class="rank-list">
        <view class="rank-item" v-for="(item, idx) in hotRanking" :key="item.name">
          <view class="rank-num" :class="'rank-' + (idx + 1)">{{ idx + 1 }}</view>
          <view class="rank-info">
            <text class="rank-name">{{ item.name }}</text>
            <text class="rank-spec">{{ item.spec }}</text>
          </view>
          <view class="rank-right">
            <text class="rank-sales">销量 {{ item.sales }}</text>
            <text class="rank-amount">¥{{ (item.amount / 100).toFixed(2) }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';

const today = new Date();
const startDate = ref(formatDateStr(new Date(today.getTime() - 7 * 86400000)));
const endDate = ref(formatDateStr(today));

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function onStartChange(e: any) { startDate.value = e.detail.value; }
function onEndChange(e: any) { endDate.value = e.detail.value; }

// Mock trend data
const trendData = reactive([
  { label: '7/19', value: 1250 },
  { label: '7/20', value: 980 },
  { label: '7/21', value: 2100 },
  { label: '7/22', value: 1650 },
  { label: '7/23', value: 2340 },
  { label: '7/24', value: 1890 },
  { label: '7/25', value: 2760 },
]);

const maxTrendValue = computed(() => Math.max(...trendData.map(d => d.value), 1));

function barHeight(value: number): string {
  const pct = (value / maxTrendValue.value) * 100;
  return pct.toFixed(0) + '%';
}

// Mock hot ranking
const hotRanking = reactive([
  { name: '招牌牛油火锅底料', spec: '500g/袋', sales: 286, amount: 114400 },
  { name: '麻辣红油调味料', spec: '1L/瓶', sales: 245, amount: 85750 },
  { name: '鲜香菌菇汤料', spec: '1L/瓶', sales: 198, amount: 59400 },
  { name: '精品芝麻酱', spec: '300g/罐', sales: 167, amount: 40080 },
  { name: '蒜蓉辣椒酱', spec: '250g/瓶', sales: 142, amount: 28400 },
]);

const totalSalesYuan = computed(() => {
  const total = hotRanking.reduce((s, i) => s + i.amount, 0);
  return (total / 100).toFixed(2);
});

const totalOrders = computed(() => 48);

const avgOrderYuan = computed(() => {
  const total = hotRanking.reduce((s, i) => s + i.amount, 0);
  return (total / 100 / (totalOrders.value || 1)).toFixed(2);
});
</script>

<style lang="scss" scoped>
.sales-page { min-height: 100vh; background: #f5f5f5; }
.date-bar { display: flex; align-items: center; padding: 20rpx 24rpx; background: #fff; gap: 12rpx; }
.date-label { font-size: 26rpx; color: #666; }
.date-value { font-size: 26rpx; color: #667eea; font-weight: 500; }
.date-sep { font-size: 26rpx; color: #999; }
.overview-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; padding: 24rpx; }
.overview-card { background: #fff; border-radius: 16rpx; padding: 24rpx; text-align: center; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.overview-value { font-size: 32rpx; font-weight: 700; color: #1a1a2e; display: block; }
.overview-label { font-size: 24rpx; color: #999; display: block; margin-top: 6rpx; }
.section { background: #fff; margin: 0 24rpx 24rpx; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 20rpx; }
.chart-area { height: 300rpx; padding-top: 20rpx; }
.bar-chart { display: flex; align-items: flex-end; justify-content: space-around; height: 100%; }
.bar-item { display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; }
.bar-wrap { flex: 1; display: flex; align-items: flex-end; width: 40rpx; }
.bar { width: 40rpx; border-radius: 6rpx 6rpx 0 0; background: linear-gradient(180deg, #667eea, #764ba2); min-height: 8rpx; transition: height .3s; }
.bar-label { font-size: 20rpx; color: #999; margin-top: 6rpx; }
.rank-list { }
.rank-item { display: flex; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.rank-item:last-child { border-bottom: none; }
.rank-num { width: 40rpx; height: 40rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 600; margin-right: 16rpx; background: #f0f0f0; color: #999; }
.rank-num.rank-1 { background: #ff6b6b; color: #fff; }
.rank-num.rank-2 { background: #ffa726; color: #fff; }
.rank-num.rank-3 { background: #ffca28; color: #fff; }
.rank-info { flex: 1; }
.rank-name { font-size: 28rpx; font-weight: 500; display: block; }
.rank-spec { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.rank-right { text-align: right; }
.rank-sales { font-size: 24rpx; color: #666; display: block; }
.rank-amount { font-size: 28rpx; font-weight: 600; color: #333; display: block; margin-top: 4rpx; }
</style>
