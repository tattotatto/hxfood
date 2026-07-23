<template>
  <view class="order-list-page">
    <view class="tabs">
      <view class="tab" v-for="t in tabs" :key="t.key" :class="{ active: activeTab === t.key }" @tap="switchTab(t.key)">
        {{ t.label }}
      </view>
    </view>

    <view class="list">
      <view class="order-card" v-for="o in orders" :key="o.id" @tap="goDetail(o.id)">
        <view class="card-header">
          <text class="order-no">{{ o.orderNo }}</text>
          <text class="tag" :class="statusClass(o.orderStatus)">{{ statusText(o.orderStatus) }}</text>
        </view>
        <view class="card-body">
          <text>共 {{ o.itemCount }} 件商品</text>
          <text class="price">{{ o.totalAmount }}</text>
        </view>
        <view class="card-footer">
          <text class="time">{{ formatTime(o.createdAt) }}</text>
        </view>
      </view>
      <view v-if="orders.length === 0" class="empty">暂无订单</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { orderApi } from '@/subpkg-common/api';

const tabs = [
  { key: '', label: '全部' },
  { key: 'pending_approval', label: '待审核' },
  { key: 'approved', label: '已审核' },
  { key: 'shipped', label: '已发货' },
  { key: 'received', label: '已完成' },
];
const activeTab = ref('');
const orders = ref<any[]>([]);

async function loadOrders() {
  try {
    const params: any = { pageSize: '50' };
    if (activeTab.value) params.status = activeTab.value;
    const res = await orderApi.list(params);
    orders.value = res.items || [];
  } catch {}
}

function switchTab(key: string) { activeTab.value = key; loadOrders(); }
function goDetail(id: string) { uni.navigateTo({ url: `/subpkg-franchisee/order/detail?id=${id}` }); }
function statusClass(s: string) {
  const map: any = { approved: 'tag-success', shipped: 'tag-primary', received: '', cancelled: 'tag-danger', pending_approval: 'tag-warning' };
  return map[s] || '';
}
function statusText(s: string) {
  const map: any = { pending_approval: '待审核', approved: '已审核', shipped: '已发货', received: '已收货', cancelled: '已取消' };
  return map[s] || s;
}
function formatTime(t: string) {
  return t ? t.substring(0, 16).replace('T', ' ') : '';
}

onMounted(() => loadOrders());
</script>

<style lang="scss" scoped>
.tabs { display: flex; background: #fff; padding: 16rpx 24rpx; gap: 12rpx; overflow-x: auto; }
.tab { padding: 10rpx 24rpx; border-radius: 20rpx; font-size: 26rpx; color: #666; background: #f5f5f5; white-space: nowrap; }
.tab.active { background: #667eea; color: #fff; }
.list { padding: 24rpx; }
.order-card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.order-no { font-size: 28rpx; font-weight: 600; }
.card-body { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; font-size: 26rpx; color: #666; }
.card-footer { font-size: 24rpx; color: #999; }
.empty { text-align: center; color: #999; padding: 80rpx; }
</style>
