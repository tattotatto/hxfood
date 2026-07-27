<template>
  <div class="admin-layout" v-if="userStore.isLoggedIn && !isLoginPage">
    <Sidebar />
    <div class="main-wrapper">
      <header class="top-bar">
        <div class="top-bar-left">
          <h2 class="page-title">{{ pageTitle }}</h2>
        </div>
        <div class="top-bar-right">
          <span class="top-bar-user">{{ userStore.profile?.realName }}</span>
          <span class="top-bar-org">{{ orgLabel }}</span>
          <button class="top-bar-logout" @click="handleLogout">退出登录</button>
        </div>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
  <div v-else class="full-page">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from './stores/user'
import Sidebar from './components/Sidebar.vue'

const userStore = useUserStore()
const route = useRoute()

const isLoginPage = computed(() => route.path === '/login')
const isNoAccessPage = computed(() => route.path === '/no-access')

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/dashboard': '工作台',
    '/organizations': '门店管理',
    '/applications': '加盟审核',
    '/products': '商品管理',
    '/orders': '订单审核',
    '/shipments': '发货管理',
    '/production': '生产管理',
    '/inventory': '库存管理',
    '/finance': '财务管理',
    '/reconciliation': '对账管理',
    '/users': '用户管理',
    '/roles': '角色管理',
    '/brand-settings': '品牌设置',
    '/warehouses': '仓库管理',
    '/analytics': '数据分析',
    '/messages': '消息管理',
    '/system-logs': '系统日志',
    '/ck-dashboard': '中央厨房工作台',
    '/supplier-dashboard': '供应商工作台',
    '/purchase-orders': '采购订单',
    '/supplier-shipments': '发货管理',
    '/supplier-finance': '财务管理',
  }
  return titles[route.path] || '核销食管理后台'
})

const orgLabel = computed(() => {
  const map: Record<string, string> = {
    headquarters: '总部',
    central_kitchen: '中央厨房',
    supplier: '供应商',
  }
  return map[userStore.currentOrgType] || '总部'
})

function handleLogout() {
  userStore.logout()
  window.location.href = '/login'
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #f5f5f5;
}
.main-wrapper {
  flex: 1;
  margin-left: 240px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.top-bar {
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 50;
}
.top-bar-left {
  display: flex;
  align-items: center;
}
.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}
.top-bar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.top-bar-user {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}
.top-bar-org {
  font-size: 12px;
  padding: 2px 10px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  border-radius: 10px;
}
.top-bar-logout {
  padding: 4px 12px;
  background: transparent;
  color: #666;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}
.top-bar-logout:hover {
  color: #ff4d4f;
  border-color: #ff4d4f;
}
.content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
.full-page {
  min-height: 100vh;
}
</style>
