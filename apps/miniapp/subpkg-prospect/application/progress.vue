<template>
  <view class="page">
    <view v-if="applications.length === 0 && !loading" class="empty">
      <text>暂无加盟申请</text>
      <button class="btn-link" @tap="goApply">去申请 →</button>
    </view>

    <view class="app-card" v-for="app in applications" :key="app.id">
      <view class="app-header">
        <text class="app-brand">{{ app.brand?.name }}</text>
        <text class="app-store">{{ app.storeName }}</text>
      </view>

      <view class="timeline">
        <view class="tl-item" :class="{ active: isActive(app, 'submitted') }">
          <view class="tl-dot"></view>
          <view class="tl-info">
            <text class="tl-title">已提交</text>
            <text class="tl-time">{{ formatDate(app.createdAt) }}</text>
          </view>
        </view>
        <view class="tl-item" :class="{ active: isActive(app, 'under_review') }">
          <view class="tl-dot"></view>
          <view class="tl-info">
            <text class="tl-title">审核中</text>
            <text class="tl-time" v-if="app.reviewedAt">{{ formatDate(app.reviewedAt) }}</text>
          </view>
        </view>
        <view class="tl-item" :class="{ active: isActive(app, 'approved') }">
          <view class="tl-dot"></view>
          <view class="tl-info">
            <text class="tl-title">{{ app.status === 'rejected' ? '已驳回' : '已通过' }}</text>
            <text class="tl-time" v-if="app.reviewComment">{{ app.reviewComment }}</text>
          </view>
        </view>
        <view class="tl-item" :class="{ active: isActive(app, 'payment_confirmed') }">
          <view class="tl-dot"></view>
          <view class="tl-info">
            <text class="tl-title">已缴费</text>
            <text class="tl-time" v-if="app.paymentConfirmedAt">{{ formatDate(app.paymentConfirmedAt) }}</text>
          </view>
        </view>
        <view class="tl-item" :class="{ active: app.status === 'activated' }">
          <view class="tl-dot"></view>
          <view class="tl-info">
            <text class="tl-title">已开通</text>
          </view>
        </view>
      </view>

      <view class="app-status-tag" :class="statusClass(app.status)">{{ statusText(app.status) }}</view>

      <view v-if="app.status === 'submitted' || app.status === 'under_review'" class="app-actions">
        <button class="btn-cancel" @tap="handleCancel(app.id)">撤销申请</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { franchiseApi } from '@/subpkg-common/api';

const applications = ref<any[]>([]);
const loading = ref(true);
const statusOrder = ['submitted', 'under_review', 'approved', 'payment_confirmed', 'activated'];

onMounted(async () => {
  try {
    applications.value = await franchiseApi.myApplications();
  } catch {}
  loading.value = false;
});

function isActive(app: any, status: string) {
  if (app.status === 'rejected' || app.status === 'cancelled') return false;
  return statusOrder.indexOf(app.status) >= statusOrder.indexOf(status);
}
function statusClass(s: string) {
  const m: any = { submitted: 'tag-info', under_review: 'tag-warning', approved: 'tag-success', payment_confirmed: 'tag-primary', activated: 'tag-success', rejected: 'tag-danger', cancelled: 'tag-default' };
  return m[s] || '';
}
function statusText(s: string) {
  const m: any = { submitted: '已提交', under_review: '审核中', approved: '已通过', payment_confirmed: '已缴费', activated: '已开通', rejected: '已驳回', cancelled: '已撤销' };
  return m[s] || s;
}
function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('zh-CN');
}
async function handleCancel(id: string) {
  const res = await uni.showModal({ title: '确认撤销', content: '确定要撤销此申请吗？' });
  if (!res.confirm) return;
  try {
    await franchiseApi.cancel(id);
    uni.showToast({ title: '已撤销', icon: 'success' });
    const apps = await franchiseApi.myApplications();
    applications.value = apps;
  } catch (e: any) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' });
  }
}
function goApply() {
  uni.navigateTo({ url: '/subpkg-prospect/brand/list' });
}
</script>

<style lang="scss" scoped>
.page { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.empty { text-align: center; padding: 100rpx 0; color: #999; }
.btn-link { color: #667eea; background: none; font-size: 26rpx; margin-top: 16rpx; }
.app-card { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-bottom: 20rpx; position: relative; }
.app-header { margin-bottom: 24rpx; }
.app-brand { font-size: 32rpx; font-weight: 600; display: block; }
.app-store { font-size: 24rpx; color: #999; margin-top: 4rpx; display: block; }
.timeline { position: relative; }
.tl-item { display: flex; align-items: flex-start; gap: 16rpx; padding-bottom: 24rpx; opacity: 0.35; }
.tl-item.active { opacity: 1; }
.tl-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: #ccc; margin-top: 6rpx; flex-shrink: 0; }
.tl-item.active .tl-dot { background: #667eea; }
.tl-title { font-size: 26rpx; display: block; }
.tl-time { font-size: 22rpx; color: #999; display: block; margin-top: 2rpx; }
.app-status-tag { position: absolute; top: 30rpx; right: 30rpx; font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 20rpx; }
.tag-info { background: #e8f4fd; color: #3498db; }
.tag-warning { background: #fef3e2; color: #f39c12; }
.tag-success { background: #e8f8e8; color: #27ae60; }
.tag-primary { background: #ede7f6; color: #667eea; }
.tag-danger { background: #fde8e8; color: #e74c3c; }
.tag-default { background: #f0f0f0; color: #999; }
.app-actions { margin-top: 20rpx; }
.btn-cancel { width: 100%; background: #fff; color: #e74c3c; border: 1rpx solid #e74c3c; border-radius: 40rpx; font-size: 26rpx; height: 64rpx; line-height: 64rpx; }
</style>
