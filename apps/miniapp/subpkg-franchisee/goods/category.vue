<template>
  <view class="category-page">
    <view class="page-loading" v-if="loading">
      <text>加载中...</text>
    </view>

    <template v-else>
      <view class="category-tree">
        <scroll-view class="level1" scroll-y>
          <view
            class="level1-item"
            v-for="cat in level1List"
            :key="cat.id"
            :class="{ active: activeL1 === cat.id }"
            @tap="selectL1(cat.id)"
          >
            <text>{{ cat.name }}</text>
          </view>
        </scroll-view>

        <scroll-view class="level2" scroll-y>
          <view class="level2-grid">
            <view
              class="level2-item"
              v-for="cat in level2List"
              :key="cat.id"
              @tap="goGoodsList(cat.id, cat.name)"
            >
              <image class="cat-img" :src="cat.image || '/static/default-goods.png'" mode="aspectFill" />
              <text class="cat-name">{{ cat.name }}</text>
            </view>
            <view v-if="level2List.length === 0" class="empty-sub">
              <text>暂无子分类</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { productApi } from '@/subpkg-common/api';

interface CategoryNode {
  id: string;
  name: string;
  image?: string;
  children?: CategoryNode[];
}

const loading = ref(true);
const categories = ref<CategoryNode[]>([]);
const activeL1 = ref('');

onMounted(async () => {
  try {
    categories.value = await productApi.getCategories();
    if (categories.value.length > 0) {
      activeL1.value = categories.value[0].id;
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
});

const level1List = computed(() => categories.value);

const level2List = computed(() => {
  const l1 = categories.value.find(c => c.id === activeL1.value);
  return l1?.children || [];
});

function selectL1(id: string) {
  activeL1.value = id;
}

function goGoodsList(categoryId: string, categoryName: string) {
  uni.navigateTo({
    url: `/subpkg-franchisee/goods/list?categoryId=${categoryId}&categoryName=${encodeURIComponent(categoryName)}`,
  });
}
</script>

<style lang="scss" scoped>
.category-page { height: 100vh; display: flex; flex-direction: column; }
.page-loading { display: flex; justify-content: center; padding: 100rpx 0; color: #999; }
.category-tree { display: flex; flex: 1; overflow: hidden; }
.level1 { width: 200rpx; background: #f5f5f5; }
.level1-item { padding: 30rpx 20rpx; font-size: 26rpx; color: #666; border-left: 4rpx solid transparent; }
.level1-item.active { background: #fff; color: #667eea; font-weight: 600; border-left-color: #667eea; }
.level2 { flex: 1; background: #fff; padding: 16rpx; }
.level2-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.level2-item { display: flex; flex-direction: column; align-items: center; padding: 16rpx 8rpx; }
.cat-img { width: 100rpx; height: 100rpx; border-radius: 16rpx; background: #f5f5f5; }
.cat-name { font-size: 24rpx; color: #333; margin-top: 8rpx; text-align: center; }
.empty-sub { grid-column: 1 / -1; text-align: center; color: #999; padding: 60rpx 0; }
</style>
