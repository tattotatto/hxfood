# Phase 6: Admin-HQ Role-based Routing + Sidebar + 13 New Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement role-based routing with dynamic sidebar menu, route guards, and 13 new pages for headquarters, central kitchen, and supplier org types.

**Architecture:** Extend existing Vue 3 Composition API pattern. Sidebar dynamically filters menu items by `orgType`. Router guards enforce auth and redirect. New pages follow existing table/form pattern with api integration.

**Tech Stack:** Vue 3, Pinia, vue-router, TypeScript, axios, lucide-vue-next

## Global Constraints
- Pattern: Vue 3 Composition API (`<script setup lang="ts">`) matching existing codebase
- Purple gradient theme: `#667eea → #764ba2`
- Sidebar: dark bg `#1a1a2e`, white text, active item highlighted with purple
- Import `api` from `../api`
- Use `ref`/`onMounted`/`computed` from 'vue'
- All pages must have loading/error states
- Follow existing table styling pattern

---

### Task 1: Update User Store with currentOrg

**Files:**
- Modify: `D:\hxfood\apps\admin-hq\src\stores\user.ts`

**Changes:** Add `currentOrg` to profile and method to determine orgType for redirects.

---

### Task 2: Layout & Router (App.vue, Sidebar.vue, router, Login)

**Files:**
- Create: `D:\hxfood\apps\admin-hq\src\components\Sidebar.vue`
- Modify: `D:\hxfood\apps\admin-hq\src\App.vue`
- Modify: `D:\hxfood\apps\admin-hq\src\router\index.ts`
- Modify: `D:\hxfood\apps\admin-hq\src\views\Login.vue`

---

### Task 3: HQ Pages — Users, Roles, BrandSettings

**Files:**
- Create: `D:\hxfood\apps\admin-hq\src\views\Users.vue`
- Create: `D:\hxfood\apps\admin-hq\src\views\Roles.vue`
- Create: `D:\hxfood\apps\admin-hq\src\views\BrandSettings.vue`

---

### Task 4: HQ Pages — Warehouses, Analytics, Messages, SystemLogs

**Files:**
- Create: `D:\hxfood\apps\admin-hq\src\views\Warehouses.vue`
- Create: `D:\hxfood\apps\admin-hq\src\views\Analytics.vue`
- Create: `D:\hxfood\apps\admin-hq\src\views\Messages.vue`
- Create: `D:\hxfood\apps\admin-hq\src\views\SystemLogs.vue`

---

### Task 5: CK + Supplier Pages (5)

**Files:**
- Create: `D:\hxfood\apps\admin-hq\src\views\CKDashboard.vue`
- Create: `D:\hxfood\apps\admin-hq\src\views\SupplierDashboard.vue`
- Create: `D:\hxfood\apps\admin-hq\src\views\PurchaseOrders.vue`
- Create: `D:\hxfood\apps\admin-hq\src\views\SupplierShipments.vue`
- Create: `D:\hxfood\apps\admin-hq\src\views\SupplierFinance.vue`
