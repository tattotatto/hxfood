<template>
  <view class="order-detail">
    <view class="page-loading" v-if="loading">
      <text>加载中...</text>
    </view>

    <template v-else-if="order">
      <!-- 订单状态 -->
      <view class="status-header" :class="statusHeaderClass">
        <text class="status-title">{{ statusText(order.orderStatus) }}</text>
        <text class="status-sub">{{ order.orderNo }}</text>
      </view>

      <!-- 商品列表 -->
      <view class="section">
        <view class="section-title">商品信息</view>
        <view class="item" v-for="item in order.items" :key="item.id">
          <view class="item-info">
            <text class="item-name">{{ item.skuName }}</text>
            <text class="item-code">编码: {{ item.skuCode }}</text>
          </view>
          <view class="item-right">
            <text class="price">¥{{ (item.unitPrice / 100).toFixed(2) }}</text>
            <text>x{{ item.quantity }}</text>
          </view>
        </view>
        <view class="total-row">
          <text>合计</text>
          <text class="price total-price">¥{{ (order.totalAmount / 100).toFixed(2) }}</text>
        </view>
      </view>

      <!-- 状态时间轴 -->
      <view class="section">
        <view class="section-title">订单轨迹</view>
        <view class="timeline">
          <view class="timeline-item" v-for="(t, idx) in order.timeline" :key="idx">
            <view class="timeline-dot" :class="{ active: idx === 0 }"></view>
            <view class="timeline-content">
              <text class="timeline-status">{{ timelineStatusText(t.status) }}</text>
              <text class="timeline-time">{{ formatTime(t.time) }}</text>
              <text class="timeline-remark" v-if="t.remark">{{ t.remark }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 订单信息 -->
      <view class="section">
        <view class="section-title">订单信息</view>
        <view class="info-row"><text class="label">订单编号</text><text>{{ order.orderNo }}</text></view>
        <view class="info-row"><text class="label">支付方式</text><text>{{ paymentText(order.paymentMethod) }}</text></view>
        <view class="info-row"><text class="label">门店</text><text>{{ order.storeName }}</text></view>
        <view class="info-row"><text class="label">下单时间</text><text>{{ formatTime(order.createdAt) }}</text></view>
      </view>

      <!-- 底部操作按钮 -->
      <view class="bottom-bar" v-if="showActions">
        <button class="btn btn-outline" v-if="canCancel" @tap="handleCancel">取消订单</button>
        <button class="btn btn-primary" v-if="canReceive" :loading="actionLoading" @tap="handleReceive">确认收货</button>
        <button
          class="btn btn-primary"
          v-for="sh in shipments"
          :key="sh.id"
          @tap="goReceive(sh.id)"
        >
          确认收货({{ sh.shipmentNo }})
        </button>
      </view>
    </template>

    <view v-else class="empty">订单不存在</view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { orderApi, shipmentApi } from '@/subpkg-common/api';
import type { OrderVo } from '@hxfood/shared-types';

const loading = ref(true);
const actionLoading = ref(false);
const order = ref<OrderVo | null>(null);
const shipments = ref<any[]>([]);

onMounted(async () => {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  const id = page.$page?.options?.id || page.options?.id;
  if (!id) {
    loading.value = false;
    return;
  }
  await loadDetail(id);
});

async function loadDetail(id: string) {
  try {
    order.value = await orderApi.detail(id);
    await loadShipments(id);
  } catch (e: any) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function loadShipments(orderId: string) {
  try {
    const res: any = await shipmentApi.list({ orderId });
    shipments.value = res.items || [];
  } catch {
    // shipments are optional
  }
}

const statusHeaderClass = computed(() => {
  const map: any = {
    pending_approval: 'status-pending',
    approved: 'status-approved',
    shipped: 'status-shipped',
    received: 'status-received',
    cancelled: 'status-cancelled',
  };
  return map[order.value?.orderStatus || ''] || '';
});

const canCancel = computed(() => {
  const s = order.value?.orderStatus;
  return s === 'pending_approval' || s === 'approved';
});

const canReceive = computed(() => order.value?.orderStatus === 'shipped' || order.value?.orderStatus === 'partially_shipped');

const showActions = computed(() => canCancel.value || canReceive.value || shipments.value.length > 0);

function statusText(s: string) {
  const map: any = { pending_approval: '待审核', approved: '已审核', shipped: '已发货', received: '已收货', cancelled: '已取消', draft: '草稿' };
  return map[s] || s;
}

function timelineStatusText(s: string) {
  const map: any = { created: '已下单', pending_approval: '待审核', approved: '审核通过', shipped: '已发货', received: '已收货', cancelled: '已取消' };
  return map[s] || s;
}

function paymentText(m: string) {
  const map: any = { balance: '余额支付', wechat: '微信支付', credit: '信用支付', mixed: '混合支付' };
  return map[m] || m;
}

function formatTime(t: string) {
  return t ? t.substring(0, 16).replace('T', ' ') : '';
}

async function handleCancel() {
  if (!order.value) return;
  const res = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '确认取消',
      content: '确定要取消该订单吗？',
      success: (r: any) => resolve(r.confirm),
    });
  });
  if (!res) return;

  actionLoading.value = true;
  try {
    await orderApi.cancel(order.value.id);
    uni.showToast({ title: '已取消', icon: 'success' });
    await loadDetail(order.value.id);
  } catch (e: any) {
    uni.showToast({ title: e.message || '取消失败', icon: 'none' });
  } finally {
    actionLoading.value = false;
  }
}

async function handleReceive() {
  if (!order.value) return;
  actionLoading.value = true;
  try {
    await orderApi.receive(order.value.id);
    uni.showToast({ title: '已确认收货', icon: 'success' });
    await loadDetail(order.value.id);
  } catch (e: any) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' });
  } finally {
    actionLoading.value = false;
  }
}

function goReceive(shipmentId: string) {
  uni.navigateTo({
    url: `/subpkg-franchisee/order/receive?id=${shipmentId}`,
  });
}
</script>

<style lang="scss" scoped>
.order-detail { min-height: 100vh; background: #f5f5f5; padding-bottom: 120rpx; }
.page-loading { display: flex; justify-content: center; padding: 100rpx 0; color: #999; }
.status-header { padding: 40rpx 30rpx; color: #fff; text-align: center; }
.status-header.status-pending { background: linear-gradient(135deg, #f0ad4e, #ec971f); }
.status-header.status-approved { background: linear-gradient(135deg, #667eea, #764ba2); }
.status-header.status-shipped { background: linear-gradient(135deg, #5bc0de, #31b0d5); }
.status-header.status-received { background: linear-gradient(135deg, #5cb85c, #449d44); }
.status-header.status-cancelled { background: linear-gradient(135deg, #999, #666); }
.status-title { display: block; font-size: 36rpx; font-weight: 700; }
.status-sub { display: block; font-size: 26rpx; margin-top: 8rpx; opacity: .8; }
.section { background: #fff; margin: 20rpx 24rpx; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 16rpx; padding-bottom: 16rpx; border-bottom: 1rpx solid #f0f0f0; }
.item { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #f5f5f5; }
.item:last-child { border-bottom: none; }
.item-info { flex: 1; }
.item-name { font-size: 28rpx; color: #333; }
.item-code { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.item-right { text-align: right; font-size: 26rpx; color: #666; }
.total-row { display: flex; justify-content: space-between; align-items: center; padding-top: 16rpx; margin-top: 8rpx; font-size: 30rpx; font-weight: 600; }
.total-price { font-size: 36rpx; }
.timeline { padding-left: 20rpx; }
.timeline-item { display: flex; padding: 16rpx 0; position: relative; }
.timeline-item::before { content: ''; position: absolute; left: 7rpx; top: 40rpx; bottom: 0; width: 2rpx; background: #e0e0e0; }
.timeline-item:last-child::before { display: none; }
.timeline-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: #ddd; margin-top: 6rpx; margin-right: 16rpx; flex-shrink: 0; z-index: 1; }
.timeline-dot.active { background: #667eea; box-shadow: 0 0 0 6rpx rgba(102,126,234,.2); }
.timeline-content { flex: 1; }
.timeline-status { font-size: 28rpx; color: #333; display: block; }
.timeline-time { font-size: 24rpx; color: #999; display: block; margin-top: 4rpx; }
.timeline-remark { font-size: 24rpx; color: #666; margin-top: 4rpx; }
.info-row { display: flex; justify-content: space-between; padding: 12rpx 0; font-size: 26rpx; color: #666; }
.info-row .label { color: #999; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; padding: 20rpx 30rpx; padding-bottom: calc(20rpx + env(safe-area-inset-bottom)); display: flex; justify-content: flex-end; gap: 20rpx; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,.08); }
.btn { padding: 16rpx 40rpx; border-radius: 40rpx; font-size: 28rpx; font-weight: 600; border: none; }
.btn-outline { background: #fff; color: #667eea; border: 2rpx solid #667eea; }
.btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; }
.empty { text-align: center; color: #999; padding: 100rpx 0; }
</style>
