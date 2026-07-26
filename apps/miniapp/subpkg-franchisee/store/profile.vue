<template>
  <view class="store-profile">
    <view class="page-loading" v-if="loading">
      <text>加载中...</text>
    </view>

    <template v-else>
      <!-- 门店信息表单 -->
      <view class="section">
        <view class="section-title">基本信息</view>
        <view class="form-item">
          <text class="form-label">门店名称</text>
          <input class="form-input" v-model="form.name" placeholder="请输入门店名称" />
        </view>
        <view class="form-item">
          <text class="form-label">联系人</text>
          <input class="form-input" v-model="form.contactPerson" placeholder="请输入联系人" />
        </view>
        <view class="form-item">
          <text class="form-label">联系电话</text>
          <input class="form-input" v-model="form.contactPhone" type="number" placeholder="请输入联系电话" maxlength="11" />
        </view>
        <view class="form-item">
          <text class="form-label">门店地址</text>
          <textarea class="form-textarea" v-model="form.address" placeholder="请输入详细地址" />
        </view>
      </view>

      <!-- 保存按钮 -->
      <view class="submit-section">
        <button class="save-btn" :loading="submitting" @tap="handleSave">保存修改</button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { orgApi } from '@/subpkg-common/api';

const loading = ref(true);
const submitting = ref(false);

const form = reactive({
  name: '',
  contactPerson: '',
  contactPhone: '',
  address: '',
});

onMounted(async () => {
  try {
    const data = await orgApi.getMyStore();
    form.name = data.name || '';
    form.contactPerson = data.contactPerson || '';
    form.contactPhone = data.contactPhone || '';
    form.address = data.address || '';
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
});

async function handleSave() {
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入门店名称', icon: 'none' });
    return;
  }
  if (!form.contactPhone.trim() || !/^\d{11}$/.test(form.contactPhone)) {
    uni.showToast({ title: '请输入有效的11位手机号', icon: 'none' });
    return;
  }

  submitting.value = true;
  try {
    await orgApi.updateMyStore({
      name: form.name,
      contactPerson: form.contactPerson,
      contactPhone: form.contactPhone,
      address: form.address,
    });
    uni.showToast({ title: '保存成功', icon: 'success' });
  } catch (e: any) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
.store-profile { min-height: 100vh; background: #f5f5f5; }
.page-loading { display: flex; justify-content: center; padding: 100rpx 0; color: #999; }
.section { background: #fff; margin: 24rpx; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 24rpx; padding-bottom: 16rpx; border-bottom: 1rpx solid #f0f0f0; }
.form-item { display: flex; align-items: flex-start; padding: 12rpx 0; }
.form-label { width: 140rpx; font-size: 28rpx; color: #333; padding-top: 8rpx; flex-shrink: 0; }
.form-input { flex: 1; font-size: 28rpx; height: 60rpx; border-bottom: 1rpx solid #f0f0f0; }
.form-textarea { flex: 1; font-size: 28rpx; min-height: 120rpx; border: 1rpx solid #f0f0f0; border-radius: 8rpx; padding: 12rpx; }
.submit-section { padding: 40rpx 24rpx; }
.save-btn { width: 100%; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 44rpx; padding: 22rpx 0; font-size: 32rpx; font-weight: 600; }
</style>
