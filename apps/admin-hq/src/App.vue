<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="logo">核销食 HQ</div>
      <nav class="nav">
        <router-link v-for="item in menuItems" :key="item.path" :to="item.path" class="nav-item">
          <span>{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
      <div class="user-info" v-if="userStore.profile">
        <span>{{ userStore.profile.realName }}</span>
        <button @click="logout">退出</button>
      </div>
    </aside>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from './stores/user'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

const menuItems = [
  { path: '/', label: '工作台', icon: '📊' },
  { path: '/products', label: '商品管理', icon: '📦' },
  { path: '/orders', label: '订单审核', icon: '📋' },
  { path: '/organizations', label: '门店管理', icon: '🏪' },
  { path: '/applications', label: '加盟审核', icon: '📝' },
  { path: '/finance', label: '财务管理', icon: '💰' },
  { path: '/inventory', label: '库存管理', icon: '🏭' },
  { path: '/production', label: '生产管理', icon: '⚙️' },
  { path: '/shipments', label: '发货管理', icon: '🚚' },
]

function logout() {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; }
.sidebar { width: 240px; background: #1a1a2e; color: #fff; display: flex; flex-direction: column; }
.logo { padding: 20px; font-size: 20px; font-weight: 700; border-bottom: 1px solid rgba(255,255,255,.1); }
.nav { flex: 1; padding: 12px 0; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 12px 20px; color: rgba(255,255,255,.7); text-decoration: none; font-size: 14px; transition: all .2s; }
.nav-item:hover, .nav-item.router-link-active { background: rgba(255,255,255,.1); color: #fff; }
.user-info { padding: 16px 20px; border-top: 1px solid rgba(255,255,255,.1); font-size: 14px; display: flex; justify-content: space-between; align-items: center; }
.content { flex: 1; padding: 24px; background: #f5f5f5; overflow-y: auto; }
</style>
