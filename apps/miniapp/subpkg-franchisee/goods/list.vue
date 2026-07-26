<template>
  <view class="goods-list-page">
    <!-- 顶栏 -->
    <view class="top-bar">
      <text class="title">{{ categoryName || '全部商品' }}</text>
      <view class="toggle-btn" @tap="toggleMode">
        <text>{{ viewMode === 'grid' ? '☰' : '▦' }}</text>
      </view>
    </view>

    <!-- 网格模式 -->
    <view class="grid-list" v-if="viewMode === 'grid'">
      <view class="goods-card" v-for="sku in skuList" :key="sku.id" @tap="goDetail(sku.id)">
        <image class="card-img" :src="sku.images?.[0] || '/static/default-goods.png'" mode="aspectFill" />
        <view class="card-info">
          <text class="card-name">{{ sku.name }}</text>
          <text class="card-spec">{{ sku.specDetail }}</text>
          <view class="card-bottom">
            <text class="price">¥{{ (sku.price / 100).toFixed(2) }}</text>
            <text class="stock">库存: {{ sku.stockAvailable }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 列表模式 -->
    <view class="row-list" v-else>
      <view class="goods-row" v-for="sku in skuList" :key="sku.id" @tap="goDetail(sku.id)">
        <image class="row-img" :src="sku.images?.[0] || '/static/default-goods.png'" mode="aspectFill" />
        <view class="row-info">
          <text class="row-name">{{ sku.name }}</text>
          <text class="row-spec">{{ sku.specDetail }}</text>
          <view class="row-bottom">
            <text class="price">¥{{ (sku.price / 100).toFixed(2) }}</text>
            <text class="stock">库存: {{ sku.stockAvailable }}</text>
          </view>
        </view>
        <text class="row-arrow">›</text>
      </view>
    </view>

    <view v-if="skuList.length === 0 && !loading" class="empty">暂无商品</view>

    <!-- 页面加载 -->
    <view class="page-loading" v-if="loading">
      <text>加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { productApi } from '@/subpkg-common/api';
import type { SkuVo } from '@hxfood/shared-types';

const viewMode = ref<'grid' | 'list'>('grid');
const loading = ref(true);
const skuList = ref<SkuVo[]>([]);
const categoryName = ref('');

onMounted(async () => {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  const options = page.$page?.options || page.options || {};
  if (options.categoryId) {
    categoryName.value = decodeURIComponent(options.categoryName || '');
  }
  await loadSkus();
});

async function loadSkus() {
  try {
    skuList.value = await productApi.getSkus();
    // client-side filter by category if needed (API does not yet support category filter)
    const pages = getCurrentPages();
    const page = pages[pages.length - 1] as any;
    const options = page.$page?.options || page.options || {};
    if (options.categoryId) {
      // Note: when getSkus supports categoryId param, pass it directly
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function toggleMode() {
  viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid';
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/subpkg-franchisee/goods/detail?id=${id}` });
}
</script>

<style lang="scss" scoped>
.goods-list-page { min-height: 100vh; background: #f5f5f5; }
.top-bar { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 24rpx; background: #fff; }
.title { font-size: 30rpx; font-weight: 600; }
.toggle-btn { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; font-size: 32rpx; border-radius: 12rpx; background: #f5f5f5; }
.grid-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16rpx; padding: 24rpx; }
.goods-card { background: #fff; border-radius: 16rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.card-img { width: 100%; height: 200rpx; background: #f5f5f5; }
.card-info { padding: 16rpx; }
.card-name { font-size: 28rpx; font-weight: 500; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-spec { font-size: 22rpx; color: #999; display: block; margin: 4rpx 0 8rpx; }
.card-bottom { display: flex; justify-content: space-between; align-items: center; }
.stock { font-size: 22rpx; color: #999; }
.row-list { padding: 0 24rpx; }
.goods-row { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.row-img { width: 120rpx; height: 120rpx; border-radius: 12rpx; background: #f5f5f5; flex-shrink: 0; }
.row-info { flex: 1; margin-left: 16rpx; }
.row-name { font-size: 28rpx; font-weight: 500; display: block; }
.row-spec { font-size: 24rpx; color: #999; display: block; margin: 4rpx 0 8rpx; }
.row-bottom { display: flex; justify-content: space-between; align-items: center; }
.row-arrow { font-size: 36rpx; color: #ccc; margin-left: 8rpx; }
.page-loading { display: flex; justify-content: center; padding: 100rpx 0; color: #999; }
.empty { text-align: center; color: #999; padding: 80rpx 0; }
</style>
