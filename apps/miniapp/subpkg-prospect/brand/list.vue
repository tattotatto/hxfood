<template>
  <view class="page">
    <view class="brand-list">
      <view class="brand-card" v-for="b in brands" :key="b.id" @tap="goDetail(b.id)">
        <image class="brand-logo" :src="b.logo || '/static/logo.png'" mode="aspectFill" />
        <view class="brand-info">
          <text class="brand-name">{{ b.name }}</text>
          <text class="brand-desc">{{ b.description }}</text>
          <text class="brand-stores">{{ b.storeCount }} 家门店</text>
        </view>
        <text class="arrow">→</text>
      </view>
      <view v-if="brands.length === 0 && !loading" class="empty">暂无品牌</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { brandApi } from '@/subpkg-common/api';

const brands = ref<any[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    brands.value = await brandApi.getList();
  } catch {}
  loading.value = false;
});

function goDetail(id: string) {
  uni.navigateTo({ url: `/subpkg-prospect/brand/detail?id=${id}` });
}
</script>

<style lang="scss" scoped>
.page { padding: 24rpx; min-height: 100vh; background: #f5f5f5; }
.brand-list { display: flex; flex-direction: column; gap: 20rpx; }
.brand-card { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,.04); }
.brand-logo { width: 120rpx; height: 120rpx; border-radius: 16rpx; background: #f0f0f0; flex-shrink: 0; }
.brand-info { flex: 1; margin: 0 20rpx; display: flex; flex-direction: column; gap: 8rpx; }
.brand-name { font-size: 32rpx; font-weight: 600; }
.brand-desc { font-size: 24rpx; color: #666; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.brand-stores { font-size: 22rpx; color: #999; }
.arrow { font-size: 28rpx; color: #ccc; }
.empty { text-align: center; color: #999; padding: 100rpx 0; }
</style>
