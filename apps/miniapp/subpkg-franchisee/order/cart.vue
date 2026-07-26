<template>
  <view class="cart-page">
    <view class="cart-list" v-if="cartItems.length > 0">
      <view class="cart-item" v-for="item in cartItems" :key="item.skuId">
        <image class="item-img" :src="item.image || '/static/default-goods.png'" mode="aspectFill" />
        <view class="item-info">
          <text class="item-name">{{ item.name }}</text>
          <text class="item-spec">{{ item.specDetail }}</text>
          <text class="price">¥{{ (item.price / 100).toFixed(2) }}</text>
        </view>
        <view class="item-qty">
          <view class="qty-stepper">
            <text class="step-btn" @tap="decrease(item)">−</text>
            <text class="step-value">{{ item.quantity }}</text>
            <text class="step-btn" @tap="increase(item)">+</text>
          </view>
        </view>
        <view class="item-del" @tap="removeItem(item.skuId)">
          <text class="del-icon">×</text>
        </view>
      </view>
    </view>

    <view v-else class="empty-cart">
      <text class="empty-icon">🛒</text>
      <text class="empty-text">购物车为空</text>
      <button class="go-btn" @tap="goShopping">去逛逛</button>
    </view>

    <!-- 底部栏 -->
    <view class="bottom-bar" v-if="cartItems.length > 0">
      <view class="summary">
        <text>共 {{ totalQty }} 件</text>
        <text class="total-amount price">¥{{ totalAmount }}</text>
      </view>
      <button class="submit-btn" :loading="submitting" @tap="batchSubmit">批量下单</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { orderApi } from '@/subpkg-common/api';
import { generateIdempotencyKey } from '@hxfood/shared-utils';

interface CartItem {
  skuId: string;
  name: string;
  specDetail: string;
  price: number;
  image: string;
  quantity: number;
  minOrderQty: number;
  stepOrderQty: number;
  stockAvailable: number;
}

const CART_KEY = 'franchisee_cart';
const cartItems = ref<CartItem[]>([]);
const submitting = ref(false);

onMounted(() => loadCart());

function loadCart() {
  try {
    const data = uni.getStorageSync(CART_KEY);
    cartItems.value = data ? JSON.parse(data) : [];
  } catch {
    cartItems.value = [];
  }
}

function saveCart() {
  uni.setStorageSync(CART_KEY, JSON.stringify(cartItems.value));
}

const totalQty = computed(() => cartItems.value.reduce((s, i) => s + i.quantity, 0));
const totalAmount = computed(() => {
  const sum = cartItems.value.reduce((s, i) => s + i.price * i.quantity, 0);
  return (sum / 100).toFixed(2);
});

function increase(item: CartItem) {
  const next = item.quantity + item.stepOrderQty;
  if (next <= item.stockAvailable) {
    item.quantity = next;
    saveCart();
  }
}

function decrease(item: CartItem) {
  const next = item.quantity - item.stepOrderQty;
  if (next >= item.minOrderQty) {
    item.quantity = next;
    saveCart();
  }
}

function removeItem(skuId: string) {
  uni.showModal({
    title: '提示',
    content: '确定要移除此商品吗？',
    success: (res: any) => {
      if (res.confirm) {
        cartItems.value = cartItems.value.filter(i => i.skuId !== skuId);
        saveCart();
      }
    },
  });
}

async function batchSubmit() {
  if (cartItems.value.length === 0) {
    uni.showToast({ title: '购物车为空', icon: 'none' });
    return;
  }

  submitting.value = true;
  try {
    await orderApi.create({
      idempotencyKey: generateIdempotencyKey('user'),
      items: cartItems.value.map(i => ({ skuId: i.skuId, quantity: i.quantity })),
      paymentMethod: 'balance',
    });
    uni.showToast({ title: '下单成功', icon: 'success' });
    cartItems.value = [];
    saveCart();
    setTimeout(() => {
      uni.navigateTo({ url: '/subpkg-franchisee/order/list' });
    }, 1000);
  } catch (e: any) {
    uni.showToast({ title: e.message || '下单失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}

function goShopping() {
  uni.navigateTo({ url: '/subpkg-franchisee/goods/list' });
}
</script>

<style lang="scss" scoped>
.cart-page { min-height: 100vh; background: #f5f5f5; padding-bottom: 140rpx; }
.cart-list { padding: 24rpx; }
.cart-item { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); position: relative; }
.item-img { width: 120rpx; height: 120rpx; border-radius: 12rpx; background: #f5f5f5; flex-shrink: 0; }
.item-info { flex: 1; margin: 0 16rpx; }
.item-name { font-size: 28rpx; font-weight: 500; display: block; }
.item-spec { font-size: 24rpx; color: #999; display: block; margin: 4rpx 0; }
.item-qty { margin-right: 12rpx; }
.item-del { width: 48rpx; display: flex; align-items: center; justify-content: center; }
.del-icon { font-size: 40rpx; color: #ccc; font-weight: 300; }
.qty-stepper { display: flex; align-items: center; gap: 8rpx; }
.step-btn { width: 44rpx; height: 44rpx; border-radius: 50%; border: 2rpx solid #e0e0e0; display: flex; align-items: center; justify-content: center; font-size: 28rpx; color: #666; }
.step-value { font-size: 26rpx; font-weight: 600; min-width: 36rpx; text-align: center; }
.empty-cart { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 160rpx 0; }
.empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-text { font-size: 28rpx; color: #999; margin-bottom: 40rpx; }
.go-btn { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 40rpx; padding: 16rpx 60rpx; font-size: 28rpx; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; padding: 20rpx 30rpx; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,.08); }
.summary { display: flex; flex-direction: column; font-size: 24rpx; color: #666; }
.total-amount { font-size: 36rpx; font-weight: 700; }
.submit-btn { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 40rpx; padding: 16rpx 48rpx; font-size: 30rpx; font-weight: 600; }
</style>
