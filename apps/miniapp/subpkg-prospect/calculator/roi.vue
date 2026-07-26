<template>
  <view class="page">
    <view class="card">
      <text class="card-title">投资回报测算</text>
      <view class="input-group">
        <text class="label">日均订单量（单）</text>
        <input v-model="dailyOrders" type="number" placeholder="如：50" class="input" />
      </view>
      <view class="input-group">
        <text class="label">平均客单价（元）</text>
        <input v-model="avgPrice" type="digit" placeholder="如：30" class="input" />
      </view>
      <view class="input-group">
        <text class="label">毛利率（%）</text>
        <input v-model="margin" type="number" placeholder="如：40" class="input" />
      </view>
      <view class="input-group">
        <text class="label">前期投入（万元）</text>
        <input v-model="investment" type="digit" placeholder="如：8" class="input" />
      </view>
    </view>

    <view class="result-card" v-if="showResult">
      <text class="result-title">测算结果</text>
      <view class="result-row">
        <text class="r-label">日均营收</text>
        <text class="r-value">{{ dailyRevenue }} 元</text>
      </view>
      <view class="result-row">
        <text class="r-label">月毛利</text>
        <text class="r-value">{{ monthlyProfit }} 元</text>
      </view>
      <view class="result-row">
        <text class="r-label">年毛利</text>
        <text class="r-value">{{ yearlyProfit }} 万元</text>
      </view>
      <view class="result-row highlight">
        <text class="r-label">预计回本周期</text>
        <text class="r-value">{{ paybackMonths }} 个月</text>
      </view>
    </view>

    <text class="disclaimer">* 此测算仅供参考，实际营收以经营情况为准</text>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const dailyOrders = ref('50');
const avgPrice = ref('30');
const margin = ref('40');
const investment = ref('8');

const showResult = computed(() => dailyOrders.value && avgPrice.value && margin.value && investment.value);
const dailyRevenue = computed(() => (Number(dailyOrders.value) * Number(avgPrice.value)).toFixed(0));
const monthlyProfit = computed(() => (Number(dailyOrders.value) * Number(avgPrice.value) * 30 * Number(margin.value) / 100).toFixed(0));
const yearlyProfit = computed(() => (Number(monthlyProfit.value) * 12 / 10000).toFixed(2));
const paybackMonths = computed(() => {
  const inv = Number(investment.value) * 10000;
  const mp = Number(monthlyProfit.value);
  return mp > 0 ? Math.ceil(inv / mp) : 0;
});
</script>

<style lang="scss" scoped>
.page { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.card { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-bottom: 20rpx; }
.card-title { font-size: 32rpx; font-weight: 600; margin-bottom: 24rpx; display: block; }
.input-group { margin-bottom: 20rpx; }
.label { font-size: 26rpx; color: #666; margin-bottom: 8rpx; display: block; }
.input { background: #f8f8f8; border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; }
.result-card { background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 16rpx; padding: 30rpx; margin-bottom: 20rpx; }
.result-title { color: #fff; font-size: 30rpx; font-weight: 600; display: block; margin-bottom: 20rpx; }
.result-row { display: flex; justify-content: space-between; padding: 12rpx 0; border-bottom: 1rpx solid rgba(255,255,255,.15); }
.result-row:last-child { border-bottom: none; }
.result-row.highlight .r-value { color: #f1c40f; font-weight: 700; }
.r-label { color: rgba(255,255,255,.8); font-size: 26rpx; }
.r-value { color: #fff; font-size: 28rpx; font-weight: 500; }
.disclaimer { font-size: 22rpx; color: #bbb; text-align: center; display: block; }
</style>
