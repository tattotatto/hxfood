<template>
  <view class="order-create">
    <!-- 商品选择区 -->
    <view class="goods-section">
      <view class="section-title">选择商品</view>
      <view class="goods-list">
        <view class="goods-item" v-for="sku in skuList" :key="sku.id">
          <image class="goods-img" :src="sku.images?.[0] || '/static/default-goods.png'" mode="aspectFill" />
          <view class="goods-info">
            <text class="goods-name">{{ sku.name }}</text>
            <text class="goods-spec">{{ sku.specDetail }}</text>
            <text class="goods-price price">{{ sku.price }}</text>
            <text class="goods-stock">库存: {{ sku.stockAvailable }}</text>
          </view>
          <view class="goods-actions">
            <view class="qty-stepper">
              <text class="step-btn" @tap="decrease(sku)">−</text>
              <text class="step-value">{{ cartQty(sku.id) }}</text>
              <text class="step-btn" @tap="increase(sku)">+</text>
            </view>
          </view>
        </view>
      </view>
      <view v-if="skuList.length === 0" class="empty">暂无可用商品</view>
    </view>

    <!-- 下单栏 -->
    <view class="bottom-bar" v-if="totalQty > 0">
      <view class="summary">
        <text>共 {{ totalQty }} 件</text>
        <text class="total-amount price">{{ totalAmount }}</text>
      </view>
      <button class="submit-btn" :loading="submitting" @tap="submitOrder">提交订单</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { productApi, orderApi } from '@/subpkg-common/api';
import { generateIdempotencyKey } from '@hxfood/shared-utils';
import type { SkuVo } from '@hxfood/shared-types';

const skuList = ref<SkuVo[]>([]);
const cart: Record<string, number> = {};
const submitting = ref(false);

const cartQty = (id: string) => cart[id] || 0;
const totalQty = computed(() => Object.values(cart).reduce((a, b) => a + b, 0));
const totalAmount = computed(() => {
  return skuList.value.reduce((sum, sku) => sum + (sku.price * (cart[sku.id] || 0)), 0).toFixed(2);
});

function increase(sku: SkuVo) {
  const current = cart[sku.id] || 0;
  if (current + sku.stepOrderQty <= sku.stockAvailable) {
    cart[sku.id] = current === 0 ? sku.minOrderQty : current + sku.stepOrderQty;
  }
}
function decrease(sku: SkuVo) {
  if ((cart[sku.id] || 0) > 0) {
    cart[sku.id] = (cart[sku.id] || 0) - sku.stepOrderQty;
    if (cart[sku.id] <= 0) delete cart[sku.id];
  }
}

onMounted(async () => {
  try { skuList.value = await productApi.getSkus(); } catch {}
});

async function submitOrder() {
  const items = Object.entries(cart).map(([skuId, quantity]) => ({ skuId, quantity }));
  if (items.length === 0) { uni.showToast({ title: '请选择商品', icon: 'none' }); return; }

  submitting.value = true;
  try {
    const result = await orderApi.create({
      idempotencyKey: generateIdempotencyKey('user'),
      items,
      paymentMethod: 'balance',
    });
    uni.showToast({ title: '下单成功', icon: 'success' });
    setTimeout(() => uni.navigateTo({ url: `/subpkg-franchisee/order/detail?id=${(result as any).id}` }), 1000);
  } catch (e: any) {
    uni.showToast({ title: e.message || '下单失败', icon: 'none' });
  } finally { submitting.value = false; }
}
</script>

<style lang="scss" scoped>
.order-create { padding-bottom: 120rpx; }
.goods-section { padding: 24rpx; }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 20rpx; }
.goods-item { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.goods-img { width: 120rpx; height: 120rpx; border-radius: 12rpx; background: #f5f5f5; flex-shrink: 0; }
.goods-info { flex: 1; margin: 0 16rpx; }
.goods-name { font-size: 28rpx; font-weight: 500; display: block; }
.goods-spec { font-size: 24rpx; color: #999; display: block; margin: 4rpx 0; }
.goods-price { font-size: 32rpx; display: block; margin: 8rpx 0; }
.goods-stock { font-size: 22rpx; color: #999; }
.qty-stepper { display: flex; align-items: center; gap: 12rpx; }
.step-btn { width: 48rpx; height: 48rpx; border-radius: 50%; border: 2rpx solid #e0e0e0; display: flex; align-items: center; justify-content: center; font-size: 32rpx; color: #666; }
.step-value { font-size: 28rpx; font-weight: 600; min-width: 40rpx; text-align: center; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; padding: 20rpx 30rpx; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,.08); }
.summary { display: flex; flex-direction: column; font-size: 24rpx; color: #666; }
.total-amount { font-size: 36rpx; font-weight: 700; }
.submit-btn { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 40rpx; padding: 16rpx 48rpx; font-size: 30rpx; font-weight: 600; }
.empty { text-align: center; color: #999; padding: 80rpx 0; }
</style>
