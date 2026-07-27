# Phase 6: Web后台 — 实现计划

> **For agentic workers:** Use superpowers:subagent-driven-development.

**Goal:** admin-hq 角色路由隔离 + 总部 8 页 + CK/供应商 Dashboard + 布局重构

**Architecture:** 单应用 admin-hq，App.vue 加侧边栏布局，router beforeEach 按 orgType 守卫，13 个新 Vue 页面

**Tech Stack:** Vue 3, Vite, shadcn-vue

---

### Task 1: 布局重构 — App.vue + Sidebar + Router

**Files:**
- Rewrite `apps/admin-hq/src/App.vue` — 侧边栏 + 顶部栏 + router-view 布局
- Create `apps/admin-hq/src/components/Sidebar.vue` — 动态菜单（从 userStore 读取 orgType，过滤菜单项，高亮当前路由）
- Modify `apps/admin-hq/src/router/index.ts` — 添加所有新路由 + beforeEach 守卫（未登录→/login，按 orgType 跳对应 dashboard）
- Modify `apps/admin-hq/src/views/Login.vue` — 登录成功后按 orgType 跳转

提交。

---

### Task 2: 总部页面 — 用户管理 + 角色权限 + 品牌设置

**Files:**
- Create `apps/admin-hq/src/views/Users.vue` — 用户列表（可搜索），创建用户表单，分配组织角色（选择组织+角色）
- Create `apps/admin-hq/src/views/Roles.vue` — 角色列表，点击编辑权限码弹窗（resource×action checkbox矩阵）
- Create `apps/admin-hq/src/views/BrandSettings.vue` — 品牌基本信息展示 + config JSONB 编辑表单

后端 API 调用：GET/POST /users（需新增简单端点或直接用 Prisma），`GET /roles` + `POST /roles/:id/permissions`

提交。

---

### Task 3: 总部页面 — 仓库管理 + 数据看板 + 消息 + 日志

**Files:**
- Create `apps/admin-hq/src/views/Warehouses.vue` — 列表/新建（对接 `GET/POST /inventory/warehouses`）
- Create `apps/admin-hq/src/views/Analytics.vue` — 订单趋势（简易柱状图）、热销排行、门店排名（Mock 数据 + 后期接 API）
- Create `apps/admin-hq/src/views/Messages.vue` — 消息模板列表 + 发送按钮（Mock）
- Create `apps/admin-hq/src/views/SystemLogs.vue` — 操作日志列表（聚合 orderStatusLog + inventoryTransaction）

提交。

---

### Task 4: CK Dashboard + 供应商页面

**Files:**
- Create `apps/admin-hq/src/views/CKDashboard.vue` — 统计卡片：待生产/库存预警/今日发货 + 快捷入口
- Create `apps/admin-hq/src/views/SupplierDashboard.vue` — 待处理采购/本月发货/对账状态
- Create `apps/admin-hq/src/views/PurchaseOrders.vue` — 采购单列表（Mock），确认/发货按钮
- Create `apps/admin-hq/src/views/SupplierShipments.vue` — 发货记录（Mock）
- Create `apps/admin-hq/src/views/SupplierFinance.vue` — 对账单（Mock）

提交。

---

### Task 5: 构建验证

```bash
cd D:/hxfood/apps/admin-hq && npx vue-tsc --noEmit
```

提交。
