<template>
  <view class="bill-list-page">
    <!-- 月份选择 -->
    <view class="month-bar">
      <text class="month-arrow" @tap="prevMonth">◀</text>
      <text class="month-text">{{ currentYear }}年{{ currentMonth }}月</text>
      <text class="month-arrow" @tap="nextMonth">▶</text>
    </view>

    <!-- 月度汇总 -->
    <view class="summary-card">
      <view class="summary-item">
        <text class="summary-label">支出</text>
        <text class="summary-value expense">-¥{{ monthExpense }}</text>
      </view>
      <view class="summary-divider"></view>
      <view class="summary-item">
        <text class="summary-label">收入</text>
        <text class="summary-value income">+¥{{ monthIncome }}</text>
      </view>
      <view class="summary-divider"></view>
      <view class="summary-item">
        <text class="summary-label">净额</text>
        <text class="summary-value" :class="monthNet >= 0 ? 'income' : 'expense'">
          {{ monthNet >= 0 ? '+' : '' }}¥{{ Math.abs(monthNet).toFixed(2) }}
        </text>
      </view>
    </view>

    <!-- 账单列表 -->
    <view class="bill-list">
      <view class="bill-group" v-for="group in groupedBills" :key="group.date">
        <view class="group-header">
          <text class="group-date">{{ group.date }}</text>
          <text class="group-total">¥{{ group.totalYuan }}</text>
        </view>
        <view class="bill-item" v-for="bill in group.items" :key="bill.id">
          <view class="bill-info">
            <text class="bill-desc">{{ bill.description }}</text>
            <text class="bill-order-no" v-if="bill.orderNo">{{ bill.orderNo }}</text>
          </view>
          <text class="bill-amount" :class="bill.type === 'income' ? 'income' : 'expense'">
            {{ bill.type === 'income' ? '+' : '-' }}¥{{ Math.abs(bill.amount).toFixed(2) }}
          </text>
        </view>
      </view>
      <view v-if="allBills.length === 0" class="empty">暂无账单</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import api from '@/subpkg-common/api/request';

interface BillItem {
  id: string;
  description: string;
  orderNo?: string;
  amount: number;
  type: 'income' | 'expense';
  createdAt: string;
}

const now = new Date();
const currentYear = ref(now.getFullYear());
const currentMonth = ref(now.getMonth() + 1);
const loading = ref(false);

const allBills = ref<BillItem[]>([]);

const transTypeLabel: Record<string, string> = {
  recharge: '账户充值',
  order_pay: '订单支出',
  refund: '订单退款',
  adjustment: '余额调整',
  credit_repay: '信用还款',
};

async function fetchBills() {
  loading.value = true;
  try {
    const res: any = await api.get('/finance/my-transactions', { page: 1, pageSize: 200 });
    const items = res?.items || [];
    allBills.value = items
      .filter((t: any) => {
        const d = new Date(t.createdAt);
        return d.getFullYear() === currentYear.value && (d.getMonth() + 1) === currentMonth.value;
      })
      .map((t: any) => ({
        id: t.id,
        description: t.remark || transTypeLabel[t.transType] || t.transType,
        orderNo: t.bizNo || undefined,
        amount: t.amount, // yuan
        type: t.amount >= 0 ? 'income' : 'expense',
        createdAt: t.createdAt,
      }))
      .sort((a: BillItem, b: BillItem) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    allBills.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(fetchBills);

const monthExpense = computed(() => {
  const total = allBills.value.filter(b => b.type === 'expense').reduce((s, b) => s + Math.abs(b.amount), 0);
  return total.toFixed(2);
});

const monthIncome = computed(() => {
  const total = allBills.value.filter(b => b.type === 'income').reduce((s, b) => s + b.amount, 0);
  return total.toFixed(2);
});

const monthNet = computed(() => {
  const inc = allBills.value.filter(b => b.type === 'income').reduce((s, b) => s + b.amount, 0);
  const exp = allBills.value.filter(b => b.type === 'expense').reduce((s, b) => s + Math.abs(b.amount), 0);
  return inc - exp;
});

const groupedBills = computed(() => {
  const groups: Record<string, BillItem[]> = {};
  for (const bill of allBills.value) {
    const dateKey = bill.createdAt.substring(0, 10);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(bill);
  }
  return Object.entries(groups).map(([date, items]) => ({
    date,
    items,
    totalYuan: items.reduce((s, b) => s + Math.abs(b.amount), 0).toFixed(2),
  }));
});

function prevMonth() {
  if (currentMonth.value === 1) {
    currentMonth.value = 12;
    currentYear.value--;
  } else {
    currentMonth.value--;
  }
  fetchBills();
}

function nextMonth() {
  if (currentMonth.value === 12) {
    currentMonth.value = 1;
    currentYear.value++;
  } else {
    currentMonth.value++;
  }
  fetchBills();
}
</script>

<style lang="scss" scoped>
.bill-list-page { min-height: 100vh; background: #f5f5f5; }
.month-bar { display: flex; align-items: center; justify-content: center; padding: 24rpx; background: #fff; gap: 30rpx; }
.month-arrow { font-size: 28rpx; color: #667eea; padding: 8rpx; }
.month-text { font-size: 32rpx; font-weight: 600; }
.summary-card { display: flex; align-items: center; margin: 24rpx; background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.summary-item { flex: 1; text-align: center; }
.summary-label { font-size: 24rpx; color: #999; display: block; margin-bottom: 6rpx; }
.summary-value { font-size: 32rpx; font-weight: 700; display: block; }
.expense { color: #e74c3c; }
.income { color: #27ae60; }
.summary-divider { width: 1rpx; height: 50rpx; background: #f0f0f0; }
.bill-list { padding: 0 24rpx; }
.bill-group { background: #fff; border-radius: 16rpx; margin-bottom: 16rpx; overflow: hidden; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.group-header { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 24rpx; background: #fafafa; }
.group-date { font-size: 28rpx; font-weight: 600; }
.group-total { font-size: 26rpx; color: #999; }
.bill-item { display: flex; justify-content: space-between; align-items: center; padding: 20rpx 24rpx; border-top: 1rpx solid #f0f0f0; }
.bill-info { flex: 1; }
.bill-desc { font-size: 26rpx; color: #333; display: block; }
.bill-order-no { font-size: 22rpx; color: #999; display: block; margin-top: 4rpx; }
.bill-amount { font-size: 30rpx; font-weight: 600; }
.empty { text-align: center; color: #999; padding: 80rpx 0; }
</style>
