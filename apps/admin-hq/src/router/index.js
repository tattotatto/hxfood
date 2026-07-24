import { createRouter, createWebHistory } from 'vue-router';
const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/login', name: 'Login', component: () => import('../views/Login.vue'), meta: { public: true } },
        { path: '/', name: 'Dashboard', component: () => import('../views/Dashboard.vue') },
        { path: '/products', name: 'Products', component: () => import('../views/Products.vue') },
        { path: '/orders', name: 'Orders', component: () => import('../views/Orders.vue') },
        { path: '/organizations', name: 'Organizations', component: () => import('../views/Organizations.vue') },
        { path: '/applications', name: 'Applications', component: () => import('../views/Applications.vue') },
        { path: '/finance', name: 'Finance', component: () => import('../views/Finance.vue') },
        { path: '/inventory', name: 'Inventory', component: () => import('../views/Inventory.vue') },
    ]
});
export default router;
