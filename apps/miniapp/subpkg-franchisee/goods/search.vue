<template>
  <view class="search-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">🔍</text>
        <input
          class="search-input"
          v-model="keyword"
          placeholder="搜索商品名称"
          confirm-type="search"
          @confirm="doSearch"
        />
        <text class="clear-btn" v-if="keyword" @tap="clearKeyword">×</text>
      </view>
      <text class="search-action" @tap="doSearch">搜索</text>
    </view>

    <!-- 搜索结果 -->
    <template v-if="searched">
      <view class="result-list" v-if="results.length > 0">
        <view class="result-item" v-for="sku in results" :key="sku.id" @tap="goDetail(sku.id)">
          <image class="result-img" :src="sku.images?.[0] || '/static/default-goods.png'" mode="aspectFill" />
          <view class="result-info">
            <text class="result-name">{{ sku.name }}</text>
            <text class="result-spec">{{ sku.specDetail }}</text>
            <text class="price">¥{{ (sku.price / 100).toFixed(2) }}</text>
          </view>
          <text class="result-arrow">›</text>
        </view>
      </view>
      <view v-else class="empty">没有找到相关商品</view>
    </template>

    <!-- 搜索历史 -->
    <template v-else>
      <view class="history-section" v-if="history.length > 0">
        <view class="section-header">
          <text class="section-title">搜索历史</text>
          <text class="clear-history" @tap="clearHistory">清除</text>
        </view>
        <view class="history-tags">
          <text class="history-tag" v-for="(h, idx) in history" :key="idx" @tap="searchHistory(h)">
            {{ h }}
          </text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { productApi } from '@/subpkg-common/api';
import type { SkuVo } from '@hxfood/shared-types';

const SEARCH_KEY = 'franchisee_search_history';

const keyword = ref('');
const searched = ref(false);
const results = ref<SkuVo[]>([]);
const history = ref<string[]>([]);

// load history on mount
try {
  const raw = uni.getStorageSync(SEARCH_KEY);
  history.value = raw ? JSON.parse(raw) : [];
} catch {
  history.value = [];
}

function saveHistory(kw: string) {
  const trimmed = kw.trim();
  if (!trimmed) return;
  history.value = [trimmed, ...history.value.filter(h => h !== trimmed)].slice(0, 20);
  uni.setStorageSync(SEARCH_KEY, JSON.stringify(history.value));
}

async function doSearch() {
  const kw = keyword.value.trim();
  if (!kw) {
    uni.showToast({ title: '请输入搜索关键词', icon: 'none' });
    return;
  }
  saveHistory(kw);
  searched.value = true;
  try {
    const all = await productApi.getSkus();
    results.value = (all || []).filter((s: SkuVo) =>
      s.name.includes(kw) || s.specDetail.includes(kw)
    );
  } catch {
    uni.showToast({ title: '搜索失败', icon: 'none' });
  }
}

function searchHistory(kw: string) {
  keyword.value = kw;
  doSearch();
}

function clearKeyword() {
  keyword.value = '';
  searched.value = false;
  results.value = [];
}

function clearHistory() {
  history.value = [];
  uni.removeStorageSync(SEARCH_KEY);
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/subpkg-franchisee/goods/detail?id=${id}` });
}
</script>

<style lang="scss" scoped>
.search-page { min-height: 100vh; background: #f5f5f5; }
.search-bar { display: flex; align-items: center; padding: 16rpx 24rpx; background: #fff; gap: 16rpx; }
.search-input-wrap { flex: 1; display: flex; align-items: center; background: #f5f5f5; border-radius: 32rpx; padding: 12rpx 20rpx; }
.search-icon { font-size: 28rpx; margin-right: 8rpx; }
.search-input { flex: 1; font-size: 28rpx; }
.clear-btn { font-size: 32rpx; color: #ccc; width: 40rpx; text-align: center; }
.search-action { font-size: 28rpx; color: #667eea; font-weight: 600; }
.result-list { padding: 24rpx; }
.result-item { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.result-img { width: 120rpx; height: 120rpx; border-radius: 12rpx; background: #f5f5f5; }
.result-info { flex: 1; margin-left: 16rpx; }
.result-name { font-size: 28rpx; font-weight: 500; display: block; }
.result-spec { font-size: 24rpx; color: #999; display: block; margin: 4rpx 0 8rpx; }
.result-arrow { font-size: 36rpx; color: #ccc; }
.history-section { padding: 24rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.section-title { font-size: 28rpx; font-weight: 600; }
.clear-history { font-size: 24rpx; color: #999; }
.history-tags { display: flex; flex-wrap: wrap; gap: 16rpx; }
.history-tag { padding: 10rpx 24rpx; background: #fff; border-radius: 20rpx; font-size: 26rpx; color: #666; border: 1rpx solid #e0e0e0; }
.empty { text-align: center; color: #999; padding: 80rpx 0; }
</style>
