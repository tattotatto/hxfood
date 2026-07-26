<template>
  <view class="msg-center">
    <view class="msg-list">
      <view
        class="msg-item"
        v-for="msg in messages"
        :key="msg.id"
        :class="{ unread: !msg.read }"
        @tap="openMsg(msg)"
      >
        <view class="msg-left">
          <view class="msg-dot" v-if="!msg.read"></view>
          <text class="msg-icon">{{ iconForType(msg.type) }}</text>
        </view>
        <view class="msg-body">
          <view class="msg-header">
            <text class="msg-title">{{ msg.title }}</text>
            <text class="msg-time">{{ formatTime(msg.createdAt) }}</text>
          </view>
          <text class="msg-content">{{ msg.content }}</text>
        </view>
        <text class="msg-arrow">›</text>
      </view>
    </view>

    <view v-if="messages.length === 0" class="empty">暂无消息</view>

    <!-- 全部已读 -->
    <view class="mark-all" v-if="unreadCount > 0" @tap="markAllRead">
      <text>全部标为已读 ({{ unreadCount }})</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface MessageItem {
  id: string;
  type: 'order' | 'system' | 'payment' | 'activity';
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
}

const messages = ref<MessageItem[]>(generateMockMessages());

function generateMockMessages(): MessageItem[] {
  const now = Date.now();
  return [
    {
      id: '1', type: 'order',
      title: '订单已发货',
      content: '您的订单 ORD20260725001 已由仓库发货，预计3-5天送达，请注意查收。',
      read: false,
      createdAt: new Date(now - 3600000).toISOString(),
    },
    {
      id: '2', type: 'payment',
      title: '充值到账提醒',
      content: '您已成功充值 500.00 元，当前账户余额 2,350.00 元。',
      read: false,
      createdAt: new Date(now - 7200000).toISOString(),
    },
    {
      id: '3', type: 'order',
      title: '订单已审核通过',
      content: '您的订单 ORD20260724003 已通过审核，请耐心等待发货。',
      read: true,
      createdAt: new Date(now - 86400000).toISOString(),
    },
    {
      id: '4', type: 'system',
      title: '系统维护通知',
      content: '系统将于7月28日凌晨02:00-04:00进行升级维护，届时可能影响访问，敬请谅解。',
      read: true,
      createdAt: new Date(now - 172800000).toISOString(),
    },
    {
      id: '5', type: 'activity',
      title: '新品上架通知',
      content: '夏季清凉系列新品已上架，包含冰粉料包、果冻粉等多款新品，欢迎选购！',
      read: true,
      createdAt: new Date(now - 259200000).toISOString(),
    },
    {
      id: '6', type: 'order',
      title: '订单已签收',
      content: '您的订单 ORD20260720001 已确认收货，感谢您的采购。',
      read: true,
      createdAt: new Date(now - 432000000).toISOString(),
    },
    {
      id: '7', type: 'payment',
      title: '账单月结提醒',
      content: '本月账单已生成，7月消费总额 12,350.00 元，请及时对账。',
      read: false,
      createdAt: new Date(now - 518400000).toISOString(),
    },
    {
      id: '8', type: 'system',
      title: '资质审核通过',
      content: '您提交的营业执照和食品经营许可证已审核通过。',
      read: true,
      createdAt: new Date(now - 604800000).toISOString(),
    },
  ];
}

const unreadCount = computed(() => messages.value.filter(m => !m.read).length);

function iconForType(type: string): string {
  const icons: Record<string, string> = {
    order: '📦',
    system: '🔔',
    payment: '💳',
    activity: '🎉',
  };
  return icons[type] || '📋';
}

function formatTime(t: string) {
  return t ? t.substring(0, 16).replace('T', ' ') : '';
}

function openMsg(msg: MessageItem) {
  msg.read = true;
  uni.showModal({
    title: msg.title,
    content: msg.content,
    showCancel: false,
    confirmText: '知道了',
  });
}

function markAllRead() {
  messages.value.forEach(m => { m.read = true; });
  uni.showToast({ title: '全部已读', icon: 'success' });
}
</script>

<style lang="scss" scoped>
.msg-center { min-height: 100vh; background: #f5f5f5; }
.msg-list { padding: 24rpx; }
.msg-item { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.msg-item.unread { background: #fafbff; }
.msg-left { margin-right: 16rpx; position: relative; }
.msg-dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: #e74c3c; position: absolute; top: -4rpx; left: -4rpx; z-index: 1; }
.msg-icon { font-size: 40rpx; }
.msg-body { flex: 1; }
.msg-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.msg-title { font-size: 28rpx; font-weight: 600; }
.msg-time { font-size: 22rpx; color: #999; }
.msg-content { font-size: 26rpx; color: #666; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.msg-arrow { font-size: 32rpx; color: #ccc; margin-left: 8rpx; }
.empty { text-align: center; color: #999; padding: 100rpx 0; font-size: 28rpx; }
.mark-all { text-align: center; padding: 20rpx; font-size: 26rpx; color: #667eea; }
</style>
