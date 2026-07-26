<template>
  <view class="recharge-page">
    <!-- 金额输入 -->
    <view class="amount-section">
      <text class="amount-label">充值金额（元）</text>
      <view class="amount-input-wrap">
        <text class="currency">¥</text>
        <input
          class="amount-input"
          v-model="amountText"
          type="digit"
          placeholder="请输入金额"
          @input="onAmountInput"
        />
      </view>
      <view class="quick-amounts">
        <view
          class="quick-item"
          v-for="amt in quickAmounts"
          :key="amt"
          :class="{ active: amount === amt }"
          @tap="selectQuick(amt)"
        >
          ¥{{ amt }}
        </view>
      </view>
    </view>

    <!-- 支付方式 -->
    <view class="section">
      <view class="section-title">支付方式</view>
      <view class="method-list">
        <view class="method-item" v-for="m in methods" :key="m.key" :class="{ active: selectedMethod === m.key }" @tap="selectedMethod = m.key">
          <text class="method-icon">{{ m.icon }}</text>
          <view class="method-info">
            <text class="method-name">{{ m.name }}</text>
            <text class="method-desc">{{ m.desc }}</text>
          </view>
          <view class="radio" :class="{ checked: selectedMethod === m.key }"></view>
        </view>
      </view>
    </view>

    <!-- 支付按钮 -->
    <view class="pay-section">
      <button class="pay-btn" :loading="submitting" @tap="submitRecharge">
        确认支付 ¥{{ displayedAmount }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { paymentApi } from '@/subpkg-common/api';

const amountText = ref('');
const amount = ref(0);
const selectedMethod = ref('balance');
const submitting = ref(false);

const quickAmounts = [100, 500, 1000, 2000, 5000];

const methods = [
  { key: 'balance', name: '余额支付', desc: '使用账户余额支付', icon: '💰' },
  { key: 'wechat', name: '微信支付', desc: '使用微信支付', icon: '💳' },
];

const displayedAmount = computed(() => {
  return amount.value ? amount.value.toFixed(2) : '0.00';
});

function onAmountInput() {
  const val = parseFloat(amountText.value);
  amount.value = isNaN(val) ? 0 : val;
}

function selectQuick(amt: number) {
  amount.value = amt;
  amountText.value = String(amt);
}

async function submitRecharge() {
  if (amount.value <= 0) {
    uni.showToast({ title: '请输入有效金额', icon: 'none' });
    return;
  }

  submitting.value = true;
  try {
    await paymentApi.payByBalance({
      amount: Math.round(amount.value * 100), // convert yuan to fen
      method: selectedMethod.value,
      description: '账户充值',
    });
    uni.showToast({ title: '充值成功', icon: 'success' });
    setTimeout(() => {
      uni.navigateBack();
    }, 1200);
  } catch (e: any) {
    uni.showToast({ title: e.message || '充值失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
.recharge-page { min-height: 100vh; background: #f5f5f5; }
.amount-section { background: #fff; padding: 36rpx 24rpx; text-align: center; }
.amount-label { font-size: 28rpx; color: #999; display: block; margin-bottom: 20rpx; }
.amount-input-wrap { display: flex; align-items: baseline; justify-content: center; border-bottom: 4rpx solid #667eea; padding-bottom: 16rpx; margin: 0 60rpx 30rpx; }
.currency { font-size: 40rpx; font-weight: 700; color: #333; }
.amount-input { font-size: 56rpx; font-weight: 700; color: #333; width: 300rpx; text-align: center; }
.quick-amounts { display: flex; justify-content: center; gap: 20rpx; flex-wrap: wrap; }
.quick-item { padding: 12rpx 28rpx; border-radius: 30rpx; font-size: 26rpx; color: #666; background: #f5f5f5; border: 2rpx solid transparent; }
.quick-item.active { background: rgba(102,126,234,.1); color: #667eea; border-color: #667eea; }
.section { background: #fff; margin: 24rpx; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 20rpx; }
.method-item { display: flex; align-items: center; padding: 20rpx 16rpx; border-radius: 12rpx; margin-bottom: 12rpx; background: #fafafa; border: 2rpx solid transparent; }
.method-item.active { border-color: #667eea; background: rgba(102,126,234,.05); }
.method-icon { font-size: 40rpx; margin-right: 16rpx; }
.method-info { flex: 1; }
.method-name { font-size: 28rpx; font-weight: 500; display: block; }
.method-desc { font-size: 24rpx; color: #999; display: block; margin-top: 4rpx; }
.radio { width: 36rpx; height: 36rpx; border-radius: 50%; border: 2rpx solid #ddd; }
.radio.checked { border-color: #667eea; background: #667eea; position: relative; }
.radio.checked::after { content: ''; position: absolute; top: 6rpx; left: 6rpx; width: 20rpx; height: 20rpx; border-radius: 50%; background: #fff; }
.pay-section { padding: 40rpx 24rpx; }
.pay-btn { width: 100%; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 44rpx; padding: 22rpx 0; font-size: 32rpx; font-weight: 600; }
</style>
