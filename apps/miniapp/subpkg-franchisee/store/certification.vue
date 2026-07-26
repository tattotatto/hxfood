<template>
  <view class="cert-page">
    <!-- 资质类别 -->
    <view class="section" v-for="cert in certifications" :key="cert.key">
      <view class="section-title">{{ cert.label }}</view>
      <view class="section-desc">{{ cert.desc }}</view>

      <!-- 已上传 -->
      <view class="preview-area" v-if="cert.imageUrl">
        <image class="preview-img" :src="cert.imageUrl" mode="aspectFill" @tap="previewImage(cert.imageUrl)" />
        <view class="preview-actions">
          <text class="preview-status status-ok">已上传</text>
          <text class="preview-reupload" @tap="uploadImage(cert.key)">重新上传</text>
        </view>
      </view>

      <!-- 未上传 -->
      <view class="upload-area" v-else @tap="uploadImage(cert.key)">
        <text class="upload-icon">+</text>
        <text class="upload-text">点击上传</text>
      </view>
    </view>

    <!-- 提交 -->
    <view class="submit-section">
      <button class="submit-btn" :loading="submitting" @tap="handleSubmit">提交认证资料</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

interface CertItem {
  key: string;
  label: string;
  desc: string;
  imageUrl: string;
}

const certifications = reactive<CertItem[]>([
  { key: 'business_license', label: '营业执照', desc: '请上传清晰完整的营业执照照片', imageUrl: '' },
  { key: 'food_license', label: '食品经营许可证', desc: '请上传清晰完整的食品经营许可证照片', imageUrl: '' },
  { key: 'health_cert', label: '从业人员健康证', desc: '请上传在有效期内的健康证明', imageUrl: '' },
]);

const submitting = ref(false);

function uploadImage(key: string) {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res: any) => {
      const cert = certifications.find(c => c.key === key);
      if (cert) {
        cert.imageUrl = res.tempFilePaths[0];
      }
    },
    fail: (err: any) => {
      if (err.errMsg !== 'chooseImage:fail cancel') {
        uni.showToast({ title: '选择图片失败', icon: 'none' });
      }
    },
  });
}

function previewImage(url: string) {
  uni.previewImage({
    urls: [url],
    current: url,
  });
}

async function handleSubmit() {
  const missing = certifications.filter(c => !c.imageUrl);
  if (missing.length > 0) {
    uni.showToast({ title: `请上传${missing[0].label}`, icon: 'none' });
    return;
  }

  submitting.value = true;
  try {
    // In production, upload images to OSS then submit URLs to backend
    // For now, show success with local paths
    uni.showToast({ title: '提交成功，等待审核', icon: 'success' });
    setTimeout(() => {
      uni.navigateBack();
    }, 1200);
  } catch (e: any) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
.cert-page { min-height: 100vh; background: #f5f5f5; padding-bottom: 120rpx; }
.section { background: #fff; margin: 24rpx; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.section-title { font-size: 30rpx; font-weight: 600; }
.section-desc { font-size: 24rpx; color: #999; margin: 8rpx 0 20rpx; }
.upload-area { border: 2rpx dashed #ddd; border-radius: 12rpx; padding: 50rpx 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.upload-icon { font-size: 60rpx; color: #ccc; }
.upload-text { font-size: 26rpx; color: #999; margin-top: 10rpx; }
.preview-area { }
.preview-img { width: 100%; height: 300rpx; border-radius: 12rpx; background: #f5f5f5; object-fit: cover; }
.preview-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 12rpx; }
.preview-status { font-size: 26rpx; font-weight: 500; }
.status-ok { color: #27ae60; }
.preview-reupload { font-size: 24rpx; color: #667eea; }
.submit-section { padding: 40rpx 24rpx; }
.submit-btn { width: 100%; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 44rpx; padding: 22rpx 0; font-size: 32rpx; font-weight: 600; }
</style>
