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
      <button class="btn-query" @click="fetchData">查询</button>
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

    <!-- Loading -->
    <view v-if="loading" class="loading">加载中...</view>

    <!-- 趋势图 -->
    <view class="section" v-if="!loading">
      <view class="section-title">销售趋势</view>
      <view class="chart-area">
        <view class="bar-chart" v-if="trendData.length > 0">
          <view class="bar-item" v-for="item in trendData" :key="item.date">
            <view class="bar-wrap">
              <view class="bar" :style="{ height: barHeight(item.count || 0) }"></view>
            </view>
            <text class="bar-label">{{ formatShortDate(item.date) }}</text>
          </view>
        </view>
        <view v-else class="empty-chart">暂无趋势数据</view>
      </view>
    </view>

    <!-- 热销排行 -->
    <view class="section" v-if="!loading">
      <view class="section-title">热销排行</view>
      <view class="rank-list">
        <view class="rank-item" v-for="(item, idx) in hotRanking" :key="item.skuId || item.name">
          <view class="rank-num" :class="'rank-' + (idx + 1)">{{ idx + 1 }}</view>
          <view class="rank-info">
            <text class="rank-name">{{ item.name }}</text>
          </view>
          <view class="rank-right">
            <text class="rank-sales">销量 {{ item.count }}</text>
            <text class="rank-amount">¥{{ item.amount }}</text>
          </view>
        </view>
        <view v-if="hotRanking.length === 0" class="empty-tip">暂无热销数据</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { orderApi } from '../../subpkg-common/api/index';

const today = new Date();
const startDate = ref(formatDateStr(new Date(today.getTime() - 7 * 86400000)));
const endDate = ref(formatDateStr(today));
const loading = ref(false);
const totalOrders = ref(0);
const totalAmountFen = ref(0);

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length >= 3) return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
  return dateStr;
}

function onStartChange(e: any) { startDate.value = e.detail.value; }
function onEndChange(e: any) { endDate.value = e.detail.value; }

// Trend data from real API
const trendData = reactive<{ date: string; count: number; amount: string }[]>([]);

const maxTrendValue = computed(() => {
  const max = Math.max(...trendData.map(d => d.count || 0), 1);
  return max;
});

function barHeight(value: number): string {
  const pct = (value / maxTrendValue.value) * 100;
  return pct.toFixed(0) + '%';
}

// Hot ranking from real API
const hotRanking = reactive<{ skuId?: string; name: string; count: number; amount: string }[]>([]);

const totalSalesYuan = computed(() => {
  return (totalAmountFen.value / 100).toFixed(2);
});

const avgOrderYuan = computed(() => {
  if (totalOrders.value === 0) return '0.00';
  return (totalAmountFen.value / 100 / totalOrders.value).toFixed(2);
});

async function fetchData() {
  loading.value = true;
  try {
    // Fetch orders in date range for trend/summary
    const orderRes = await orderApi.list({
      startDate: startDate.value,
      endDate: endDate.value,
      pageSize: 200,
    });

    const orders = orderRes.items || orderRes || [];
    totalOrders.value = orders.length;
    totalAmountFen.value = orders.reduce((sum: number, o: any) => {
      const amt = typeof o.totalAmount === 'string' ? Math.round(parseFloat(o.totalAmount) * 100) : (o.totalAmount || 0);
      return sum + amt;
    }, 0);

    // Build trend data by date
    const dateMap = new Map<string, { count: number; amount: number }>();
    const dayMs = 24 * 60 * 60 * 1000;
    const start = new Date(startDate.value).getTime();
    const end = new Date(endDate.value).getTime();
    for (let t = start; t <= end; t += dayMs) {
      const d = new Date(t);
      const key = d.toISOString().substring(0, 10);
      dateMap.set(key, { count: 0, amount: 0 });
    }
    for (const o of orders) {
      const key = (o.createdAt || '').substring(0, 10);
      const entry = dateMap.get(key);
      if (entry) {
        entry.count += 1;
        entry.amount += (typeof o.totalAmount === 'string' ? Math.round(parseFloat(o.totalAmount) * 100) : (o.totalAmount || 0));
      }
    }
    const trendArr = Array.from(dateMap.entries()).map(([date, val]) => ({
      date,
      count: val.count,
      amount: (val.amount / 100).toFixed(2),
    }));
    trendData.splice(0, trendData.length, ...trendArr);

    // Fetch hot SKUs from analytics
    try {
      const api = (await import('../../subpkg-common/api/request')).default;
      const hotRes: any = await api.get('/analytics/hot-skus');
      if (hotRes && Array.isArray(hotRes)) {
        hotRanking.splice(0, hotRanking.length, ...hotRes);
      }
    } catch {
      // Fallback: build top items from orders
      const skuMap = new Map<string, { name: string; count: number; amount: number }>();
      for (const o of orders) {
        const items = o.items || o.orderItems || [];
        for (const item of items) {
          const key = item.skuName || item.skuCode || item.skuId;
          const entry = skuMap.get(key) || { name: key, count: 0, amount: 0 };
          entry.count += Number(item.quantity || 0);
          entry.amount += Number(item.amount || 0);
          skuMap.set(key, entry);
        }
      }
      const sorted = Array.from(skuMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((s) => ({
          name: s.name,
          count: s.count,
          amount: (s.amount / 100).toFixed(2),
        }));
      hotRanking.splice(0, hotRanking.length, ...sorted);
    }
  } catch (e: any) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

// Initial fetch
fetchData();
</script>

<style lang="scss" scoped>
.sales-page { min-height: 100vh; background: #f5f5f5; }
.date-bar { display: flex; align-items: center; padding: 20rpx 24rpx; background: #fff; gap: 12rpx; }
.date-label { font-size: 26rpx; color: #666; }
.date-value { font-size: 26rpx; color: #667eea; font-weight: 500; }
.date-sep { font-size: 26rpx; color: #999; }
.btn-query { font-size: 24rpx; padding: 6rpx 20rpx; background: #667eea; color: #fff; border: none; border-radius: 8rpx; line-height: 1.6; }
.overview-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; padding: 24rpx; }
.overview-card { background: #fff; border-radius: 16rpx; padding: 24rpx; text-align: center; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.overview-value { font-size: 32rpx; font-weight: 700; color: #1a1a2e; display: block; }
.overview-label { font-size: 24rpx; color: #999; display: block; margin-top: 6rpx; }
.loading { text-align: center; padding: 60rpx; color: #999; }
.section { background: #fff; margin: 0 24rpx 24rpx; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 20rpx; }
.chart-area { height: 300rpx; padding-top: 20rpx; }
.empty-chart { display: flex; align-items: center; justify-content: center; height: 100%; color: #999; font-size: 26rpx; }
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
.rank-right { text-align: right; }
.rank-sales { font-size: 24rpx; color: #666; display: block; }
.rank-amount { font-size: 28rpx; font-weight: 600; color: #333; display: block; margin-top: 4rpx; }
.empty-tip { text-align: center; color: #999; padding: 20rpx; font-size: 26rpx; }
</style>
