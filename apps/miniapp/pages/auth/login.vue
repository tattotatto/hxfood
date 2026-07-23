<template>
  <view class="login-page">
    <view class="logo-area">
      <image class="logo" src="/static/logo.png" mode="aspectFit" />
      <text class="title">核销食</text>
      <text class="subtitle">连锁餐饮订货管理系统</text>
    </view>

    <view class="form-area">
      <view class="input-group">
        <input v-model="username" placeholder="请输入账号" />
      </view>
      <view class="input-group">
        <input v-model="password" type="password" placeholder="请输入密码" />
      </view>
      <button class="btn-primary" :loading="loading" @tap="handleLogin">登录</button>
    </view>

    <view class="wechat-area">
      <button class="btn-wechat" open-type="getPhoneNumber" @getphonenumber="handleWechatLogin">
        微信一键登录
      </button>
    </view>

    <view class="footer">
      <text class="link" @tap="goToFranchise">了解加盟 →</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '@/subpkg-common/stores/user';

const userStore = useUserStore();
const username = ref('');
const password = ref('');
const loading = ref(false);

async function handleLogin() {
  if (!username.value || !password.value) {
    uni.showToast({ title: '请输入账号和密码', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    await userStore.login(username.value, password.value);
    redirectByRole();
  } catch (e: any) {
    uni.showToast({ title: e.message || '登录失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function handleWechatLogin(e: any) {
  // wx.login() 获取 code，后端 code2session
  const { code } = await uni.login({ provider: 'weixin' });
  try {
    await userStore.wechatLogin(code);
    redirectByRole();
  } catch (err: any) {
    uni.showToast({ title: '微信登录失败', icon: 'none' });
  }
}

function redirectByRole() {
  const org = userStore.currentOrg;
  if (!org) {
    uni.switchTab({ url: '/subpkg-prospect/brand/list' });
    return;
  }
  if (org.orgType === 'franchise_store') {
    uni.switchTab({ url: '/subpkg-franchisee/dashboard/index' });
  }
}

function goToFranchise() {
  uni.navigateTo({ url: '/subpkg-prospect/brand/list' });
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 60rpx 40rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.logo-area { text-align: center; margin-bottom: 80rpx; }
.logo { width: 160rpx; height: 160rpx; border-radius: 32rpx; background: #fff; }
.title { display: block; font-size: 48rpx; color: #fff; font-weight: 700; margin-top: 20rpx; }
.subtitle { display: block; font-size: 26rpx; color: rgba(255,255,255,.7); margin-top: 8rpx; }

.form-area { width: 100%; }
.input-group {
  background: rgba(255,255,255,.95);
  border-radius: 16rpx;
  padding: 24rpx 30rpx;
  margin-bottom: 24rpx;
}
.input-group input { width: 100%; font-size: 30rpx; }

.btn-primary {
  width: 100%; height: 88rpx;
  background: #fff; color: #667eea;
  border-radius: 44rpx; font-size: 32rpx; font-weight: 600;
  margin-top: 40rpx;
}

.wechat-area { width: 100%; margin-top: 40rpx; }
.btn-wechat { background: rgba(255,255,255,.2); color: #fff; border-radius: 44rpx; }

.footer { margin-top: 60rpx; }
.link { color: rgba(255,255,255,.8); font-size: 28rpx; }
</style>
