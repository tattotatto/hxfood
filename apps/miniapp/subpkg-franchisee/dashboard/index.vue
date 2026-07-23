<template>
  <view class="dashboard">
    <view class="header">
      <text class="greeting">{{ storeName }}</text>
      <text class="sub">今日营业数据</text>
    </view>

    <view class="stat-grid">
      <view class="stat-card" v-for="s in stats" :key="s.label">
        <text class="stat-value">{{ s.value }}</text>
        <text class="stat-label">{{ s.label }}</text>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">快捷操作</text>
      </view>
      <view class="quick-actions">
        <view class="action-item" @tap="navigateTo('/subpkg-franchisee/order/create')">
          <text class="action-icon">🛒</text>
          <text>下单订货</text>
        </view>
        <view class="action-item" @tap="navigateTo('/subpkg-franchisee/order/list')">
          <text class="action-icon">📋</text>
          <text>我的订单</text>
        </view>
        <view class="action-item" @tap="navigateTo('/subpkg-franchisee/payment/account')">
          <text class="action-icon">💰</text>
          <text>账户余额</text>
        </view>
        <view class="action-item" @tap="navigateTo('/subpkg-franchisee/store/profile')">
          <text class="action-icon">🏪</text>
          <text>门店信息</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-header">
        <text class="section-title">近期订单</text>
        <text class="more" @tap="navigateTo('/subpkg-franchisee/order/list')">全部 →</text>
      </view>
      <view class="order-list">
        <view class="order-item" v-for="o in recentOrders" :key="o.id" @tap="navigateTo('/subpkg-franchisee/order/detail?id=' + o.id)">
          <view class="order-info">
            <text class="order-no">{{ o.orderNo }}</text>
            <text class="order-time">{{ o.createdAt }}</text>
          </view>
          <view class="order-right">
            <text class="order-amount price">{{ o.totalAmount }}</text>
            <text class="tag" :class="statusClass(o.orderStatus)">{{ statusText(o.orderStatus) }}</text>
          </view>
        </view>
        <text v-if="recentOrders.length === 0" class="empty">暂无订单</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/subpkg-common/stores/user';
import { orderApi } from '@/subpkg-common/api';

const storeName = ref('加盟店');
const stats = ref([
  { label: '今日订单', value: 0 },
  { label: '待发货', value: 0 },
  { label: '本月订单', value: 0 },
  { label: '账户余额', value: '¥0' },
]);
const recentOrders = ref<any[]>([]);

onMounted(async () => {
  try {
    const res = await orderApi.list({ pageSize: '5' });
    recentOrders.value = res.items || [];
  } catch {}
});

function statusClass(s: string) {
  const map: any = { approved: 'tag-success', shipped: 'tag-primary', received: '', cancelled: 'tag-danger', pending_approval: 'tag-warning' };
  return map[s] || '';
}
function statusText(s: string) {
  const map: any = { pending_approval: '待审核', approved: '已审核', shipped: '已发货', received: '已收货', cancelled: '已取消', draft: '草稿' };
  return map[s] || s;
}
function navigateTo(url: string) { uni.navigateTo({ url }); }
</script>

<style lang="scss" scoped>
.dashboard { padding: 24rpx; }
.header { padding: 40rpx 0 30rpx; }
.greeting { display: block; font-size: 40rpx; font-weight: 700; }
.sub { display: block; font-size: 26rpx; color: #999; margin-top: 8rpx; }
.stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; margin-bottom: 30rpx; }
.stat-card { background: #fff; border-radius: 16rpx; padding: 30rpx; text-align: center; box-shadow: 0 2rpx 12rpx rgba(0,0,0,.04); }
.stat-value { display: block; font-size: 40rpx; font-weight: 700; color: #1a1a2e; }
.stat-label { display: block; font-size: 24rpx; color: #999; margin-top: 8rpx; }
.section { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,.04); }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.section-title { font-size: 30rpx; font-weight: 600; }
.more { font-size: 24rpx; color: #667eea; }
.quick-actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20rpx; }
.action-item { display: flex; flex-direction: column; align-items: center; gap: 8rpx; font-size: 24rpx; color: #666; }
.action-icon { font-size: 48rpx; }
.order-item { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.order-no { font-size: 28rpx; font-weight: 500; }
.order-time { font-size: 24rpx; color: #999; display: block; margin-top: 4rpx; }
.order-right { text-align: right; }
.order-amount { font-size: 30rpx; display: block; }
.empty { text-align: center; color: #999; padding: 40rpx 0; }
</style>
