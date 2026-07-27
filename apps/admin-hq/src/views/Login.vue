<template>
  <div class="login-page">
    <div class="login-card">
      <h1>核销食总部管理后台</h1>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>用户名</label>
          <input v-model="username" type="text" placeholder="请输入用户名" />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="请输入密码" />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()
const router = useRouter()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await userStore.login(username.value, password.value)
    // Redirect based on orgType
    if (userStore.isFranchiseStore) {
      router.push('/no-access')
    } else {
      router.push(userStore.dashboardRoute)
    }
  } catch (e: any) {
    error.value = e.response?.data?.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f0f2f5; }
.login-card { width: 400px; padding: 40px; background: #fff; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,.1); }
.login-card h1 { text-align: center; font-size: 22px; margin-bottom: 32px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; margin-bottom: 6px; font-size: 14px; color: #333; }
.form-group input { width: 100%; padding: 10px 12px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
.error { color: #ff4d4f; font-size: 13px; margin-bottom: 12px; }
button[type="submit"] { width: 100%; padding: 10px; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
button[type="submit"]:disabled { opacity: .6; cursor: not-allowed; }
</style>
