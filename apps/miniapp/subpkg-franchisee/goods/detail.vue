<template>
  <view class="goods-detail">
    <view class="page-loading" v-if="loading">
      <text>加载中...</text>
    </view>

    <template v-else-if="sku">
      <!-- 图片轮播 -->
      <swiper class="image-swiper" indicator-dots indicator-color="rgba(255,255,255,.5)" indicator-active-color="#667eea" circular>
        <swiper-item v-for="(img, idx) in sku.images?.length ? sku.images : [noImage]" :key="idx">
          <image class="swiper-img" :src="img" mode="aspectFill" />
        </swiper-item>
      </swiper>

      <!-- 基本信息 -->
      <view class="info-section">
        <view class="price-row">
          <text class="price">¥{{ (sku.price / 100).toFixed(2) }}</text>
          <text class="stock" v-if="sku.stockAvailable > 0">库存 {{ sku.stockAvailable }}</text>
          <text class="stock stock-out" v-else>已售罄</text>
        </view>
        <text class="sku-name">{{ sku.name }}</text>
        <text class="sku-spec">{{ sku.specDetail }}</text>
      </view>

      <!-- 订购信息 -->
      <view class="section">
        <view class="section-title">订购说明</view>
        <view class="info-row"><text class="label">最小起订量</text><text>{{ sku.minOrderQty }}</text></view>
        <view class="info-row"><text class="label">起订步长</text><text>{{ sku.stepOrderQty }}</text></view>
        <view class="info-row"><text class="label">商品编码</text><text>{{ sku.skuCode }}</text></view>
      </view>

      <!-- 底部操作 -->
      <view class="bottom-bar">
        <view class="qty-stepper">
          <text class="step-btn" @tap="decrease">−</text>
          <text class="step-value">{{ orderQty }}</text>
          <text class="step-btn" @tap="increase">+</text>
        </view>
        <button class="add-btn" :disabled="sku.stockAvailable <= 0" @tap="addToCart">
          加入购物车
        </button>
      </view>
    </template>

    <view v-else class="empty">商品不存在</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { productApi } from '@/subpkg-common/api';
import type { SkuVo } from '@hxfood/shared-types';

const noImage = '/static/default-goods.png';
const CART_KEY = 'franchisee_cart';

const loading = ref(true);
const sku = ref<SkuVo | null>(null);
const orderQty = ref(0);

onMounted(async () => {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  const id = page.$page?.options?.id || page.options?.id;
  if (!id) {
    loading.value = false;
    return;
  }
  try {
    sku.value = await productApi.getSkuById(id);
    orderQty.value = sku.value.minOrderQty || 0;
  } catch (e: any) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
});

function increase() {
  if (!sku.value) return;
  const next = orderQty.value + sku.value.stepOrderQty;
  if (next <= sku.value.stockAvailable) {
    orderQty.value = next;
  }
}

function decrease() {
  if (!sku.value) return;
  const next = orderQty.value - sku.value.stepOrderQty;
  if (next >= sku.value.minOrderQty) {
    orderQty.value = next;
  }
}

function addToCart() {
  if (!sku.value || orderQty.value <= 0) {
    uni.showToast({ title: '请选择数量', icon: 'none' });
    return;
  }

  try {
    const raw = uni.getStorageSync(CART_KEY);
    const cart: any[] = raw ? JSON.parse(raw) : [];

    const existing = cart.find((i: any) => i.skuId === sku.value!.id);
    if (existing) {
      existing.quantity += orderQty.value;
    } else {
      cart.push({
        skuId: sku.value.id,
        name: sku.value.name,
        specDetail: sku.value.specDetail,
        price: sku.value.price,
        image: sku.value.images?.[0] || '',
        quantity: orderQty.value,
        minOrderQty: sku.value.minOrderQty,
        stepOrderQty: sku.value.stepOrderQty,
        stockAvailable: sku.value.stockAvailable,
      });
    }

    uni.setStorageSync(CART_KEY, JSON.stringify(cart));
    uni.showToast({ title: '已加入购物车', icon: 'success' });
  } catch {
    uni.showToast({ title: '操作失败', icon: 'none' });
  }
}
</script>

<style lang="scss" scoped>
.goods-detail { min-height: 100vh; background: #f5f5f5; padding-bottom: 120rpx; }
.page-loading { display: flex; justify-content: center; padding: 100rpx 0; color: #999; }
.image-swiper { width: 100%; height: 500rpx; }
.swiper-img { width: 100%; height: 100%; background: #f5f5f5; }
.info-section { background: #fff; padding: 24rpx; }
.price-row { display: flex; align-items: baseline; gap: 16rpx; margin-bottom: 12rpx; }
.price { font-size: 44rpx; font-weight: 700; color: #e74c3c; }
.stock { font-size: 24rpx; color: #999; }
.stock-out { color: #e74c3c; }
.sku-name { font-size: 32rpx; font-weight: 600; display: block; }
.sku-spec { font-size: 26rpx; color: #999; display: block; margin-top: 8rpx; }
.section { background: #fff; margin: 20rpx 24rpx; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 16rpx; padding-bottom: 12rpx; border-bottom: 1rpx solid #f0f0f0; }
.info-row { display: flex; justify-content: space-between; padding: 10rpx 0; font-size: 26rpx; color: #666; }
.info-row .label { color: #999; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; padding: 20rpx 30rpx; display: flex; align-items: center; gap: 20rpx; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,.08); }
.qty-stepper { display: flex; align-items: center; gap: 12rpx; }
.step-btn { width: 52rpx; height: 52rpx; border-radius: 50%; border: 2rpx solid #e0e0e0; display: flex; align-items: center; justify-content: center; font-size: 32rpx; color: #666; }
.step-value { font-size: 32rpx; font-weight: 600; min-width: 50rpx; text-align: center; }
.add-btn { flex: 1; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 40rpx; padding: 18rpx 0; font-size: 30rpx; font-weight: 600; }
.add-btn[disabled] { background: #ccc; color: #999; }
.empty { text-align: center; color: #999; padding: 100rpx 0; }
</style>
