import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Public
    { path: '/login', name: 'Login', component: () => import('../views/Login.vue'), meta: { public: true } },

    // Headquarters routes
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', name: 'Dashboard', component: () => import('../views/Dashboard.vue') },
    { path: '/organizations', name: 'Organizations', component: () => import('../views/Organizations.vue') },
    { path: '/applications', name: 'Applications', component: () => import('../views/Applications.vue') },
    { path: '/products', name: 'Products', component: () => import('../views/Products.vue') },
    { path: '/orders', name: 'Orders', component: () => import('../views/Orders.vue') },
    { path: '/shipments', name: 'Shipments', component: () => import('../views/Shipments.vue') },
    { path: '/production', name: 'Production', component: () => import('../views/Production.vue') },
    { path: '/inventory', name: 'Inventory', component: () => import('../views/Inventory.vue') },
    { path: '/finance', name: 'Finance', component: () => import('../views/Finance.vue') },
    { path: '/reconciliation', name: 'Reconciliation', component: () => import('../views/Reconciliation.vue') },
    { path: '/users', name: 'Users', component: () => import('../views/Users.vue') },
    { path: '/roles', name: 'Roles', component: () => import('../views/Roles.vue') },
    { path: '/brand-settings', name: 'BrandSettings', component: () => import('../views/BrandSettings.vue') },
    { path: '/warehouses', name: 'Warehouses', component: () => import('../views/Warehouses.vue') },
    { path: '/analytics', name: 'Analytics', component: () => import('../views/Analytics.vue') },
    { path: '/messages', name: 'Messages', component: () => import('../views/Messages.vue') },
    { path: '/system-logs', name: 'SystemLogs', component: () => import('../views/SystemLogs.vue') },

    // Central Kitchen routes
    { path: '/ck-dashboard', name: 'CKDashboard', component: () => import('../views/CKDashboard.vue') },

    // Supplier routes
    { path: '/supplier-dashboard', name: 'SupplierDashboard', component: () => import('../views/SupplierDashboard.vue') },
    { path: '/purchase-orders', name: 'PurchaseOrders', component: () => import('../views/PurchaseOrders.vue') },
    { path: '/supplier-shipments', name: 'SupplierShipments', component: () => import('../views/SupplierShipments.vue') },
    { path: '/supplier-finance', name: 'SupplierFinance', component: () => import('../views/SupplierFinance.vue') },

    // Franchise store - no web access
    { path: '/no-access', name: 'NoAccess', component: { template: '<div class="no-access-page"><div class="no-access-card"><h1>无法访问</h1><p>加盟门店暂无Web管理后台权限，请使用小程序进行操作。</p></div></div>' } },

    // Catch-all
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()
  const isLoggedIn = !!userStore.token && !!userStore.profile

  if (to.meta.public) {
    // If logged in and going to /login, redirect to dashboard per orgType
    if (isLoggedIn && to.path === '/login') {
      if (userStore.isFranchiseStore) {
        next('/no-access')
      } else {
        next(userStore.dashboardRoute)
      }
      return
    }
    next()
    return
  }

  // Not logged in → /login
  if (!isLoggedIn) {
    next('/login')
    return
  }

  // Franchise store → no access
  if (userStore.isFranchiseStore) {
    next('/no-access')
    return
  }

  next()
})

export default router
