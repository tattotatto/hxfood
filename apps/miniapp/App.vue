<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';

onLaunch(() => {
  console.log('核销食 App Launch');
  // 检查登录态
  const token = uni.getStorageSync('accessToken');
  if (token) {
    // 验证 token 有效性
  }
});

onShow(() => {
  console.log('App Show');
});

onHide(() => {
  console.log('App Hide');
});
</script>

<style lang="scss">
/* 全局样式 */
page {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 28rpx;
  color: #333;
}

/* 通用工具类 */
.flex-center { display: flex; align-items: center; justify-content: center; }
.flex-between { display: flex; align-items: center; justify-content: space-between; }
.text-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.price { color: #e63946; font-weight: 600; }
.price::before { content: '¥'; font-size: 0.8em; }
.tag { display: inline-block; padding: 2rpx 12rpx; border-radius: 8rpx; font-size: 22rpx; }
.tag-primary { background: #e8f4fd; color: #1890ff; }
.tag-success { background: #e6f7e6; color: #52c41a; }
.tag-warning { background: #fff7e6; color: #fa8c16; }
.tag-danger { background: #fff1f0; color: #f5222d; }
</style>
