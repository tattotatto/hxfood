<template>
  <view class="page">
    <view class="hero">
      <image class="hero-img" :src="brand.config?.bannerImage || '/static/logo.png'" mode="aspectFill" />
      <view class="hero-overlay">
        <text class="brand-name">{{ brand.name }}</text>
        <text class="brand-stores">{{ brand.storeCount }} 家门店</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">品牌介绍</text>
      <text class="section-content">{{ brand.config?.description || '暂无介绍' }}</text>
    </view>

    <view class="section" v-if="brand.config?.franchiseConditions">
      <text class="section-title">加盟条件</text>
      <text class="section-content">{{ brand.config.franchiseConditions }}</text>
    </view>

    <view class="section" v-if="brand.config?.franchiseFee">
      <text class="section-title">费用说明</text>
      <text class="section-content">{{ brand.config.franchiseFee }}</text>
    </view>

    <view class="bottom-bar">
      <button class="btn-primary" @tap="goApply">立即申请加盟</button>
      <button class="btn-outline" @tap="goGuide">加盟指南</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { brandApi } from '@/subpkg-common/api';

const brand = ref<any>({ config: {} });

onLoad(async (options: any) => {
  try {
    const id = options?.id || '';
    if (id) {
      brand.value = await brandApi.getDetail(id);
    }
  } catch {}
});

function goApply() {
  uni.navigateTo({ url: `/subpkg-prospect/application/form?brandId=${brand.value.id}` });
}
function goGuide() {
  uni.navigateTo({ url: '/subpkg-prospect/application/guide' });
}
</script>

<style lang="scss" scoped>
.page { background: #f5f5f5; padding-bottom: 140rpx; }
.hero { position: relative; height: 360rpx; }
.hero-img { width: 100%; height: 100%; }
.hero-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 40rpx 30rpx; background: linear-gradient(transparent, rgba(0,0,0,.6)); }
.brand-name { color: #fff; font-size: 40rpx; font-weight: 700; display: block; }
.brand-stores { color: rgba(255,255,255,.8); font-size: 24rpx; margin-top: 6rpx; }
.section { background: #fff; margin: 20rpx; border-radius: 16rpx; padding: 30rpx; }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 16rpx; display: block; }
.section-content { font-size: 26rpx; color: #666; line-height: 1.8; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; gap: 20rpx; padding: 20rpx 30rpx; background: #fff; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,.08); }
.btn-primary { flex: 1; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border-radius: 40rpx; font-size: 28rpx; font-weight: 600; }
.btn-outline { flex: 1; background: #fff; color: #667eea; border: 2rpx solid #667eea; border-radius: 40rpx; font-size: 28rpx; }
</style>
