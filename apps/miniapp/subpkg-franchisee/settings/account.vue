<template>
  <view class="account-settings">
    <!-- 手机绑定状态 -->
    <view class="section">
      <view class="section-title">安全设置</view>
      <view class="info-row">
        <text class="row-label">绑定手机</text>
        <view class="row-right">
          <text class="row-value">{{ phoneMask }}</text>
          <text class="row-status status-ok">已绑定</text>
        </view>
      </view>
      <view class="info-row">
        <text class="row-label">登录密码</text>
        <view class="row-right">
          <text class="row-value">••••••</text>
          <text class="row-action" @tap="showPwdForm = true">修改</text>
        </view>
      </view>
    </view>

    <!-- 修改密码表单 -->
    <view class="section" v-if="showPwdForm">
      <view class="section-title">修改密码</view>
      <view class="form-item">
        <text class="form-label">当前密码</text>
        <input class="form-input" v-model="pwdForm.oldPassword" type="password" placeholder="请输入当前密码" />
      </view>
      <view class="form-item">
        <text class="form-label">新密码</text>
        <input class="form-input" v-model="pwdForm.newPassword" type="password" placeholder="请输入新密码（6-20位）" />
      </view>
      <view class="form-item">
        <text class="form-label">确认密码</text>
        <input class="form-input" v-model="pwdForm.confirmPassword" type="password" placeholder="请再次输入新密码" />
      </view>
      <view class="form-tips">
        <text>密码长度6-20位，建议包含字母和数字</text>
      </view>
      <button class="save-btn" :loading="pwdSubmitting" @tap="handleChangePwd">确认修改</button>
    </view>

    <!-- 账号信息 -->
    <view class="section">
      <view class="section-title">账号信息</view>
      <view class="info-row">
        <text class="row-label">账号</text>
        <text class="row-value">{{ username }}</text>
      </view>
      <view class="info-row">
        <text class="row-label">姓名</text>
        <text class="row-value">{{ realName }}</text>
      </view>
      <view class="info-row">
        <text class="row-label">所属组织</text>
        <text class="row-value">{{ orgName }}</text>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout-section">
      <button class="logout-btn" @tap="handleLogout">退出登录</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useUserStore } from '@/subpkg-common/stores/user';

const userStore = useUserStore();
const showPwdForm = ref(false);
const pwdSubmitting = ref(false);

const phoneMask = ref('138****5678');
const username = ref('franchisee01');
const realName = ref('张三');
const orgName = ref('张记火锅食材店');

const pwdForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

onMounted(() => {
  if (userStore.profile) {
    username.value = userStore.profile.username || username.value;
    realName.value = userStore.profile.realName || realName.value;
    phoneMask.value = maskPhone(userStore.profile.phone || '138****5678');
    orgName.value = userStore.profile.currentOrg?.name || orgName.value;
  }
});

function maskPhone(phone: string): string {
  if (phone.length === 11) {
    return phone.substring(0, 3) + '****' + phone.substring(7);
  }
  return phone;
}

async function handleChangePwd() {
  if (!pwdForm.oldPassword) {
    uni.showToast({ title: '请输入当前密码', icon: 'none' });
    return;
  }
  if (pwdForm.newPassword.length < 6 || pwdForm.newPassword.length > 20) {
    uni.showToast({ title: '新密码长度6-20位', icon: 'none' });
    return;
  }
  if (pwdForm.newPassword !== pwdForm.confirmPassword) {
    uni.showToast({ title: '两次新密码不一致', icon: 'none' });
    return;
  }

  pwdSubmitting.value = true;
  try {
    // await authApi.changePassword(pwdForm.oldPassword, pwdForm.newPassword);
    uni.showToast({ title: '密码修改成功', icon: 'success' });
    showPwdForm.value = false;
    pwdForm.oldPassword = '';
    pwdForm.newPassword = '';
    pwdForm.confirmPassword = '';
  } catch (e: any) {
    uni.showToast({ title: e.message || '修改失败', icon: 'none' });
  } finally {
    pwdSubmitting.value = false;
  }
}

function handleLogout() {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res: any) => {
      if (res.confirm) {
        userStore.logout();
      }
    },
  });
}
</script>

<style lang="scss" scoped>
.account-settings { min-height: 100vh; background: #f5f5f5; padding-bottom: 60rpx; }
.section { background: #fff; margin: 24rpx; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04); }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 20rpx; padding-bottom: 12rpx; border-bottom: 1rpx solid #f0f0f0; }
.info-row { display: flex; justify-content: space-between; align-items: center; padding: 14rpx 0; }
.row-label { font-size: 28rpx; color: #666; }
.row-right { display: flex; align-items: center; gap: 12rpx; }
.row-value { font-size: 28rpx; color: #333; }
.row-status { font-size: 24rpx; }
.status-ok { color: #27ae60; }
.row-action { font-size: 24rpx; color: #667eea; }
.form-item { display: flex; align-items: center; padding: 12rpx 0; }
.form-label { width: 140rpx; font-size: 28rpx; color: #333; flex-shrink: 0; }
.form-input { flex: 1; font-size: 28rpx; height: 60rpx; border-bottom: 1rpx solid #f0f0f0; }
.form-tips { font-size: 24rpx; color: #999; padding: 12rpx 0 20rpx; }
.save-btn { width: 100%; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 44rpx; padding: 20rpx 0; font-size: 30rpx; font-weight: 600; margin-top: 8rpx; }
.logout-section { padding: 40rpx 24rpx; }
.logout-btn { width: 100%; background: #fff; color: #e74c3c; border: 2rpx solid #e74c3c; border-radius: 44rpx; padding: 20rpx 0; font-size: 30rpx; font-weight: 600; }
</style>
