<template>
  <view class="page">
    <view class="section">
      <text class="section-title">资质文件上传</text>
      <text class="section-tip">请上传清晰的证件照片，支持 jpg/png 格式</text>
    </view>

    <view class="upload-item" v-for="item in items" :key="item.key">
      <view class="upload-label">
        <text>{{ item.label }}</text>
        <text class="required" v-if="item.required">*</text>
      </view>
      <view class="upload-area" @tap="chooseImage(item.key)">
        <image v-if="files[item.key]" :src="files[item.key]" mode="aspectFill" class="preview" />
        <view v-else class="placeholder">
          <text class="plus">+</text>
          <text class="upload-text">点击上传</text>
        </view>
      </view>
    </view>

    <button class="submit-btn" :loading="uploading" @tap="handleUpload">提交资料</button>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

const files = reactive<Record<string, string>>({});
const uploading = ref(false);

const items = [
  { key: 'businessLicense', label: '营业执照', required: true },
  { key: 'foodLicense', label: '食品经营许可证', required: true },
  { key: 'healthCert', label: '健康证', required: false },
  { key: 'idCard', label: '身份证', required: true },
];

function chooseImage(key: string) {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      files[key] = res.tempFilePaths[0];
    },
  });
}

async function handleUpload() {
  if (!files.businessLicense || !files.foodLicense || !files.idCard) {
    uni.showToast({ title: '请上传必填证件', icon: 'none' });
    return;
  }
  uploading.value = true;
  uni.showToast({ title: '上传成功（开发阶段模拟）', icon: 'success' });
  uploading.value = false;
}
</script>

<style lang="scss" scoped>
.page { padding: 24rpx; background: #f5f5f5; min-height: 100vh; padding-bottom: 120rpx; }
.section { margin-bottom: 30rpx; }
.section-title { font-size: 30rpx; font-weight: 600; display: block; }
.section-tip { font-size: 24rpx; color: #999; display: block; margin-top: 8rpx; }
.upload-item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
.upload-label { font-size: 28rpx; font-weight: 500; margin-bottom: 16rpx; }
.required { color: #e74c3c; }
.upload-area { width: 100%; height: 200rpx; border-radius: 12rpx; overflow: hidden; background: #f8f8f8; border: 2rpx dashed #ddd; display: flex; align-items: center; justify-content: center; }
.preview { width: 100%; height: 100%; }
.placeholder { text-align: center; }
.plus { font-size: 48rpx; color: #ccc; display: block; }
.upload-text { font-size: 24rpx; color: #999; margin-top: 4rpx; }
.submit-btn { margin-top: 30rpx; width: 100%; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border-radius: 44rpx; font-size: 32rpx; font-weight: 600; height: 88rpx; line-height: 88rpx; }
</style>
