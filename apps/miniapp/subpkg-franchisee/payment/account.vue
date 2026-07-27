<template>
  <view class="account-page">
    <!-- 余额卡片 -->
    <view class="balance-card">
      <text class="balance-label">账户余额（元）</text>
      <text class="balance-value">{{ balanceYuan }}</text>
      <view class="balance-row">
        <text class="credit">信用额度: ¥{{ creditLimitYuan }}</text>
      </view>
      <view class="card-actions">
        <button class="btn" @tap="goRecharge">充值</button>
        <button class="btn btn-outline" @tap="goBills">账单</button>
      </view>
    </view>

    <!-- 最近交易 -->
    <view class="section">
      <view class="section-title">最近交易</view>
      <view class="tx-list">
        <view class="tx-item" v-for="tx in transactions" :key="tx.id">
          <view class="tx-info">
            <text class="tx-desc">{{ tx.description }}</text>
            <text class="tx-time">{{ formatTime(tx.createdAt) }}</text>
          </view>
          <text class="tx-amount" :class="tx.type === 'income' ? 'tx-income' : 'tx-expense'">
            {{ tx.type === 'income' ? '+' : '-' }}¥{{ Math.abs(tx.amount).toFixed(2) }}
          </text>
        </view>
        <view v-if="transactions.length === 0" class="empty">暂无交易记录</view>
      </view>
    </view>

    <!-- 充值记录 -->
    <view class="section" v-if="rechargeRecords.length > 0">
      <view class="section-title">充值记录</view>
      <view class="tx-list">
        <view class="tx-item" v-for="rec in rechargeRecords" :key="'r' + rec.id">
          <view class="tx-info">
            <text class="tx-desc">{{ rec.remark || '账户充值' }}</text>
            <text class="tx-time">{{ formatTime(rec.createdAt) }}</text>
          </view>
          <text class="tx-amount tx-income">+¥{{ (rec.amount).toFixed(2) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { orgApi } from '@/subpkg-common/api';
import api from '@/subpkg-common/api/request';

interface TransactionItem {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  createdAt: string;
}

const storeInfo = ref<any>(null);
const transactions = ref<TransactionItem[]>([]);
const rechargeRecords = ref<any[]>([]);

onMounted(async () => {
  try {
    storeInfo.value = (await orgApi.getMyStore()).data || await orgApi.getMyStore();
  } catch {}

  try {
    const financeData: any = await api.get('/finance/my-account');
    if (financeData) {
      storeInfo.value = { ...storeInfo.value, ...financeData };
    }
  } catch {}

  try {
    const txRes: any = await api.get('/finance/my-transactions', { page: 1 });
    const items = txRes?.items || [];
    transactions.value = items.map((t: any) => ({
      id: t.id,
      description: t.remark || t.transType,
      amount: t.amount, // already in yuan from API
      type: t.amount >= 0 ? 'income' : 'expense',
      createdAt: t.createdAt,
    }));
    rechargeRecords.value = items.filter((t: any) => t.transType === 'recharge');
  } catch {
    // fallback: no transactions
  }
});

const balanceYuan = computed(() => {
  const raw = storeInfo.value?.balance ?? 0;
  return (raw / 100).toFixed(2);
});

const creditLimitYuan = computed(() => {
  const raw = storeInfo.value?.creditLimit ?? 0;
  return (raw / 100).toFixed(2);
});

function formatTime(t: string) {
  return t ? t.substring(0, 16).replace('T', ' ') : '';
}

function goRecharge() {
  uni.navigateTo({ url: '/subpkg-franchisee/payment/recharge' });
}

function goBills() {
  uni.navigateTo({ url: '/subpkg-franchisee/payment/bill-list' });
}
</script>

<style lang="scss" scoped>
.account-page { min-height: 100vh; background: #f5f5f5; }
.balance-card { margin: 24rpx; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 20rpx; padding: 36rpx; color: #fff; }
.balance-label { font-size: 26rpx; opacity: .8; display: block; }
.balance-value { font-size: 60rpx; font-weight: 700; display: block; margin: 12rpx 0; }
.balance-row { margin-bottom: 20rpx; }
.credit { font-size: 26rpx; opacity: .8; }
.card-actions { display: flex; gap: 20rpx; }
.card-actions .btn { flex: 1; padding: 14rpx 0; border-radius: 30rpx; font-size: 26rpx; font-weight: 600; border: none; background: rgba(255,255,255,.25); color: #fff; }
.card-actions .btn-outline { background: transparent; border: 2rpx solid rgba(255,255,255,.5); }
.section { background: #fff; margin: 0 24rpx 24rpx; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 16rpx; }
.tx-item { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.tx-item:last-child { border-bottom: none; }
.tx-info { flex: 1; }
.tx-desc { font-size: 26rpx; color: #333; display: block; }
.tx-time { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.tx-amount { font-size: 30rpx; font-weight: 600; }
.tx-income { color: #27ae60; }
.tx-expense { color: #e74c3c; }
.empty { text-align: center; color: #999; padding: 40rpx 0; font-size: 26rpx; }
</style>
