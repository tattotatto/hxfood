import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '../api';
import type { UserProfile, OrgProfile } from '@hxfood/shared-types';

export const useUserStore = defineStore('user', () => {
  const token = ref(uni.getStorageSync('accessToken') || '');
  const refreshToken = ref(uni.getStorageSync('refreshToken') || '');
  const profile = ref<UserProfile | null>(null);

  const isLoggedIn = computed(() => !!token.value);
  const currentOrg = computed(() => profile.value?.currentOrg);

  async function login(username: string, password: string) {
    const res = await authApi.login(username, password);
    token.value = res.accessToken;
    refreshToken.value = res.refreshToken;
    uni.setStorageSync('accessToken', res.accessToken);
    uni.setStorageSync('refreshToken', res.refreshToken);
    await loadProfile();
  }

  async function wechatLogin(code: string) {
    const res = await authApi.wechatLogin(code);
    token.value = res.accessToken;
    refreshToken.value = res.refreshToken;
    uni.setStorageSync('accessToken', res.accessToken);
    uni.setStorageSync('refreshToken', res.refreshToken);
    await loadProfile();
  }

  async function loadProfile() {
    if (!token.value) return;
    try {
      profile.value = await authApi.getProfile();
      if (profile.value?.currentOrg) {
        uni.setStorageSync('currentBrandId', profile.value.currentOrg.brandId);
      }
    } catch {
      logout();
    }
  }

  function logout() {
    token.value = '';
    refreshToken.value = '';
    profile.value = null;
    uni.removeStorageSync('accessToken');
    uni.removeStorageSync('refreshToken');
    uni.removeStorageSync('currentBrandId');
    uni.reLaunch({ url: '/pages/auth/login' });
  }

  return { token, refreshToken, profile, isLoggedIn, currentOrg, login, wechatLogin, loadProfile, logout };
});
