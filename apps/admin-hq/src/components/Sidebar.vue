<template>
  <aside class="sidebar">
    <div class="logo">核销食 HQ</div>
    <nav class="nav">
      <router-link
        v-for="item in filteredMenuItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.label }}</span>
      </router-link>
    </nav>
    <div class="user-info" v-if="userStore.profile">
      <span class="user-name">{{ userStore.profile.realName }}</span>
      <span class="org-type-tag">{{ orgTypeLabel }}</span>
      <button class="logout-btn" @click="logout">退出</button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()
const route = useRoute()

interface MenuItem {
  path: string
  label: string
  icon: string
}

const headquartersMenu: MenuItem[] = [
  { path: '/dashboard', label: '工作台', icon: '📊' },
  { path: '/organizations', label: '门店管理', icon: '🏪' },
  { path: '/applications', label: '加盟审核', icon: '📝' },
  { path: '/products', label: '商品管理', icon: '📦' },
  { path: '/orders', label: '订单审核', icon: '📋' },
  { path: '/shipments', label: '发货管理', icon: '🚚' },
  { path: '/production', label: '生产管理', icon: '⚙️' },
  { path: '/inventory', label: '库存管理', icon: '🏭' },
  { path: '/finance', label: '财务管理', icon: '💰' },
  { path: '/reconciliation', label: '对账管理', icon: '📑' },
  { path: '/users', label: '用户管理', icon: '👥' },
  { path: '/roles', label: '角色管理', icon: '🔑' },
  { path: '/brand-settings', label: '品牌设置', icon: '🎨' },
  { path: '/warehouses', label: '仓库管理', icon: '🏗️' },
  { path: '/analytics', label: '数据分析', icon: '📈' },
  { path: '/messages', label: '消息管理', icon: '💬' },
  { path: '/system-logs', label: '系统日志', icon: '📜' },
]

const centralKitchenMenu: MenuItem[] = [
  { path: '/ck-dashboard', label: '工作台', icon: '📊' },
  { path: '/production', label: '生产管理', icon: '⚙️' },
  { path: '/inventory', label: '库存管理', icon: '🏭' },
  { path: '/shipments', label: '发货管理', icon: '🚚' },
  { path: '/warehouses', label: '仓库管理', icon: '🏗️' },
]

const supplierMenu: MenuItem[] = [
  { path: '/supplier-dashboard', label: '工作台', icon: '📊' },
  { path: '/purchase-orders', label: '采购订单', icon: '📋' },
  { path: '/supplier-shipments', label: '发货管理', icon: '🚚' },
  { path: '/supplier-finance', label: '财务管理', icon: '💰' },
]

const filteredMenuItems = computed<MenuItem[]>(() => {
  if (userStore.isCentralKitchen) return centralKitchenMenu
  if (userStore.isSupplier) return supplierMenu
  return headquartersMenu
})

const orgTypeLabel = computed(() => {
  const map: Record<string, string> = {
    headquarters: '总部',
    central_kitchen: '中央厨房',
    supplier: '供应商',
    franchise_store: '加盟门店',
  }
  return map[userStore.currentOrgType] || '总部'
})

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path === path || route.path.startsWith(path + '?')
}

function logout() {
  userStore.logout()
  window.location.href = '/login'
}
</script>

<style scoped>
.sidebar {
  width: 240px;
  min-height: 100vh;
  background: #1a1a2e;
  color: #fff;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
  overflow-y: auto;
}
.logo {
  padding: 20px;
  font-size: 20px;
  font-weight: 700;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
}
.nav {
  flex: 1;
  padding: 12px 0;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
.nav-item.active,
.nav-item.router-link-active {
  background: rgba(102, 126, 234, 0.2);
  color: #fff;
  border-left-color: #667eea;
}
.nav-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}
.nav-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user-info {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.user-name {
  font-weight: 600;
  font-size: 15px;
}
.org-type-tag {
  font-size: 11px;
  padding: 2px 8px;
  background: rgba(102, 126, 234, 0.3);
  border-radius: 10px;
  text-align: center;
  width: fit-content;
}
.logout-btn {
  margin-top: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  width: 100%;
}
.logout-btn:hover {
  background: rgba(255, 77, 79, 0.2);
  border-color: rgba(255, 77, 79, 0.4);
}
</style>
