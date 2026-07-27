<template>
  <view class="receive-page">
    <view class="page-loading" v-if="loading">
      <text>加载中...</text>
    </view>

    <template v-else-if="shipment">
      <!-- Header -->
      <view class="header">
        <text class="header-title">确认收货</text>
        <text class="header-no">发货单: {{ shipment.shipmentNo }}</text>
      </view>

      <!-- Shipment Info -->
      <view class="section">
        <view class="section-title">发货信息</view>
        <view class="info-row">
          <text class="label">发货仓库</text>
          <text>{{ shipment.fromWarehouse?.name || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="label">收货门店</text>
          <text>{{ shipment.toStore?.name || '-' }}</text>
        </view>
        <view class="info-row" v-if="shipment.carrier">
          <text class="label">承运方</text>
          <text>{{ shipment.carrier }}</text>
        </view>
        <view class="info-row" v-if="shipment.trackingNo">
          <text class="label">运单号</text>
          <text>{{ shipment.trackingNo }}</text>
        </view>
        <view class="info-row">
          <text class="label">状态</text>
          <text class="tag" :class="statusClass">{{ statusText }}</text>
        </view>
      </view>

      <!-- Items -->
      <view class="section">
        <view class="section-title">收货明细</view>
        <view class="item" v-for="(it, idx) in items" :key="it.id">
          <view class="item-header">
            <text class="item-name">{{ it.sku?.spu?.name || it.sku?.name || '-' }}</text>
            <text class="item-code">{{ it.sku?.skuCode || '' }}</text>
          </view>
          <view class="item-body">
            <text class="item-qty-label">发货数量: {{ it.quantity }}</text>
            <view class="item-receive">
              <text class="item-qty-label">实收数量:</text>
              <input
                class="qty-input"
                type="number"
                v-model="items[idx].receiveQty"
                :max="it.quantity"
                :min="0"
                placeholder="0"
              />
            </view>
          </view>
        </view>
      </view>

      <!-- Submit -->
      <view class="bottom-bar">
        <button
          class="btn btn-primary"
          :loading="submitting"
          :disabled="!canSubmit"
          @tap="handleSubmit"
        >
          确认收货
        </button>
      </view>
    </template>

    <view v-else class="empty">发货单不存在</view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { shipmentApi } from '@/subpkg-common/api';

interface ShipmentItem {
  id: string;
  skuId: string;
  quantity: number;
  sku?: any;
  receiveQty: number;
}

const loading = ref(true);
const submitting = ref(false);
const shipment = ref<any>(null);
const items = ref<ShipmentItem[]>([]);

onMounted(async () => {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  const id = page.$page?.options?.id || page.options?.id;
  if (!id) {
    loading.value = false;
    return;
  }
  await loadShipment(id);
});

async function loadShipment(id: string) {
  try {
    const res: any = await shipmentApi.getDetail(id);
    shipment.value = res;
    items.value = (res.inTransits || []).map((it: any) => ({
      id: it.id,
      skuId: it.skuId,
      quantity: it.quantity,
      sku: it.sku,
      receiveQty: 0,
    }));
  } catch (e: any) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

const statusText = computed(() => {
  const map: any = {
    pending: '待发货',
    shipped: '已发货',
    in_transit: '运输中',
    partially_received: '部分签收',
    received: '已签收',
    cancelled: '已取消',
  };
  return map[shipment.value?.status] || shipment.value?.status || '';
});

const statusClass = computed(() => {
  const map: any = {
    shipped: 'tag-primary',
    partially_received: 'tag-warning',
    received: 'tag-success',
  };
  return map[shipment.value?.status] || '';
});

const canSubmit = computed(() => {
  if (submitting.value) return false;
  const s = shipment.value?.status;
  if (s !== 'shipped' && s !== 'partially_received') return false;
  return items.value.some((it) => it.receiveQty > 0);
});

async function handleSubmit() {
  const receiveItems = items.value
    .filter((it) => it.receiveQty > 0)
    .map((it) => ({ skuId: it.skuId, qty: it.receiveQty }));

  if (receiveItems.length === 0) {
    uni.showToast({ title: '请填写实收数量', icon: 'none' });
    return;
  }

  const res = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '确认收货',
      content: '确认收到以上数量的商品吗？',
      success: (r: any) => resolve(r.confirm),
    });
  });
  if (!res) return;

  submitting.value = true;
  try {
    await shipmentApi.receive(shipment.value.id, { items: receiveItems });
    uni.showToast({ title: '收货确认成功', icon: 'success' });
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (e: any) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
.receive-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 120rpx;
}

.page-loading {
  display: flex;
  justify-content: center;
  padding: 100rpx 0;
  color: #999;
}

.header {
  padding: 40rpx 30rpx;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  text-align: center;
}

.header-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
}

.header-no {
  display: block;
  font-size: 26rpx;
  margin-top: 8rpx;
  opacity: 0.8;
}

.section {
  background: #fff;
  margin: 20rpx 24rpx;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, .04);
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  font-size: 26rpx;
  color: #666;
}

.info-row .label {
  color: #999;
}

.tag {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.tag-primary {
  background: #e6f0ff;
  color: #667eea;
}

.tag-warning {
  background: #fff7e6;
  color: #f0ad4e;
}

.tag-success {
  background: #e6ffe6;
  color: #52c41a;
}

.item {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.item:last-child {
  border-bottom: none;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.item-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.item-code {
  font-size: 22rpx;
  color: #999;
}

.item-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-qty-label {
  font-size: 24rpx;
  color: #999;
}

.item-receive {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.qty-input {
  width: 120rpx;
  height: 56rpx;
  border: 1rpx solid #e0e0e0;
  border-radius: 8rpx;
  text-align: center;
  font-size: 28rpx;
  color: #333;
  background: #fafafa;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, .08);
}

.btn {
  padding: 20rpx 40rpx;
  border-radius: 40rpx;
  font-size: 30rpx;
  font-weight: 600;
  border: none;
  width: 100%;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}

.btn[disabled] {
  opacity: 0.5;
}

.empty {
  text-align: center;
  color: #999;
  padding: 100rpx 0;
}
</style>
