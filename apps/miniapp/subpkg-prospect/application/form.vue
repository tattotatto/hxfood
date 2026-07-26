<template>
  <view class="page">
    <view class="form">
      <view class="form-group">
        <text class="label">姓名 <text class="required">*</text></text>
        <input v-model="form.applicantName" placeholder="请输入姓名" class="input" />
      </view>
      <view class="form-group">
        <text class="label">手机号 <text class="required">*</text></text>
        <input v-model="form.applicantPhone" placeholder="请输入手机号" type="number" maxlength="11" class="input" />
      </view>
      <view class="form-group">
        <text class="label">门店名称 <text class="required">*</text></text>
        <input v-model="form.storeName" placeholder="请输入门店名称" class="input" />
      </view>
      <view class="form-group">
        <text class="label">城市 <text class="required">*</text></text>
        <input v-model="form.city" placeholder="如：广州市" class="input" />
      </view>
      <view class="form-group">
        <text class="label">详细地址 <text class="required">*</text></text>
        <input v-model="form.address" placeholder="请输入详细地址" class="input" />
      </view>
      <view class="form-group">
        <text class="label">投资预算（万元）</text>
        <input v-model="form.investmentBudget" placeholder="如：10" type="digit" class="input" />
      </view>
      <view class="form-group">
        <text class="label">备注</text>
        <textarea v-model="form.remark" placeholder="其他补充说明（选填）" class="textarea" />
      </view>
    </view>

    <button class="submit-btn" :loading="submitting" @tap="handleSubmit">提交申请</button>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { franchiseApi } from '@/subpkg-common/api';

let brandId = '';

onLoad((options: any) => {
  brandId = options?.brandId || '';
  form.brandId = brandId;
});

const form = reactive({
  brandId: '',
  applicantName: '',
  applicantPhone: '',
  storeName: '',
  city: '',
  address: '',
  investmentBudget: undefined as number | undefined,
  remark: '',
});
const submitting = ref(false);

async function handleSubmit() {
  if (!form.applicantName || !form.applicantPhone || !form.storeName || !form.city || !form.address) {
    uni.showToast({ title: '请填写必填字段', icon: 'none' });
    return;
  }
  if (!/^1\d{10}$/.test(form.applicantPhone)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    await franchiseApi.apply({
      ...form,
      investmentBudget: form.investmentBudget ? Number(form.investmentBudget) : undefined,
    });
    uni.showToast({ title: '提交成功', icon: 'success' });
    setTimeout(() => uni.navigateTo({ url: '/subpkg-prospect/application/progress' }), 1000);
  } catch (e: any) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
.page { padding: 24rpx; background: #f5f5f5; min-height: 100vh; padding-bottom: 120rpx; }
.form { background: #fff; border-radius: 16rpx; padding: 30rpx; }
.form-group { margin-bottom: 30rpx; }
.form-group:last-child { margin-bottom: 0; }
.label { font-size: 28rpx; font-weight: 500; color: #333; margin-bottom: 12rpx; display: block; }
.required { color: #e74c3c; }
.input { background: #f8f8f8; border-radius: 12rpx; padding: 20rpx 24rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; }
.textarea { background: #f8f8f8; border-radius: 12rpx; padding: 20rpx 24rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; min-height: 160rpx; }
.submit-btn { margin: 40rpx 0; width: 100%; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border-radius: 44rpx; font-size: 32rpx; font-weight: 600; height: 88rpx; line-height: 88rpx; }
</style>
