# Phase 6: Web后台 — 系统设计文档

> **目标**: 完善 admin-hq 后台，按角色路由隔离，补齐总部/CK/供应商核心页面

---

## 1. 设计决策

| 决策点 | 选择 | 说明 |
|--------|------|------|
| **后台架构** | 单应用 + 角色路由 | admin-hq 单体，按 orgType 跳转不同 Dashboard + 侧边栏过滤 |
| **页面范围** | 完整版 | 总部 8 新页 + CK Dashboard + 供应商 4 页 + 布局重构 |
| **供应商采购** | Mock 数据 | 不建采购订单表，页面用 Mock 数据预留接口 |

---

## 2. 角色路由架构

### 2.1 登录跳转

```
headquarters    → /dashboard
central_kitchen → /ck-dashboard
supplier        → /supplier-dashboard
```

### 2.2 侧边栏菜单过滤

**总部菜单 (13项):** 工作台/组织/加盟/商品/订单/发货/生产/库存/财务/对账/用户/权限/品牌设置/仓库管理/数据看板/消息

**CK菜单 (4项):** 工作台/生产工单/库存管理/发货管理/仓库管理

**供应商菜单 (4项):** 工作台/采购订单/发货记录/对账结算

---

## 3. 新增页面

### 3.1 总部（8 页）

| 页面 | 路由 | 说明 |
|------|------|------|
| Users | /users | 用户CRUD + 分配组织角色 |
| Roles | /roles | 角色列表 + 权限码编辑 |
| BrandSettings | /brand-settings | 品牌 config 编辑 |
| Warehouses | /warehouses | 仓库管理 |
| Analytics | /analytics | 订单趋势+热销+门店排名 |
| Messages | /messages | 消息模板列表 |
| SystemLogs | /system-logs | 操作日志聚合 |

### 3.2 中央厨房（1 页）

| 页面 | 路由 | 说明 |
|------|------|------|
| CKDashboard | /ck-dashboard | 生产/库存/发货统计卡片 |

### 3.3 供应商（4 页）

| 页面 | 路由 | 说明 |
|------|------|------|
| SupplierDashboard | /supplier-dashboard | 采购/发货/对账统计 |
| PurchaseOrders | /purchase-orders | 采购单列表（Mock） |
| SupplierShipments | /supplier-shipments | 发货记录（Mock） |
| SupplierFinance | /supplier-finance | 对账单（Mock） |

### 3.4 现有页面改造

- Login.vue: 角色跳转
- App.vue: 侧边栏 + 顶部栏
- router/index.ts: 新路由 + beforeEach 守卫

---

## 4. 文件变更

```
apps/admin-hq/src/
├── App.vue                           ← Rewrite: 侧边栏布局
├── components/
│   └── Sidebar.vue                   ← Create: 动态菜单组件
├── router/index.ts                   ← Modify: +路由 +守卫
├── stores/user.ts                    ← Modify: 角色判断逻辑
└── views/
    ├── Login.vue                     ← Modify: 角色跳转
    ├── Dashboard.vue                 ← 保持
    ├── Users.vue                     ← Create
    ├── Roles.vue                     ← Create
    ├── BrandSettings.vue             ← Create
    ├── Warehouses.vue                ← Create
    ├── Analytics.vue                 ← Create
    ├── Messages.vue                  ← Create
    ├── SystemLogs.vue                ← Create
    ├── CKDashboard.vue               ← Create
    ├── SupplierDashboard.vue         ← Create
    ├── PurchaseOrders.vue            ← Create
    ├── SupplierShipments.vue         ← Create
    └── SupplierFinance.vue           ← Create
```

---

## 5. 验收标准

| # | 条件 |
|---|------|
| 1 | 总部登录 → /dashboard，侧边栏显示全部菜单 |
| 2 | CK登录 → /ck-dashboard，侧边栏仅 CK 菜单 |
| 3 | 供应商登录 → /supplier-dashboard，侧边栏仅供应商菜单 |
| 4 | 用户管理 CRUD 可用 |
| 5 | 角色权限编辑可用 |
| 6 | 所有新页面可正常打开 |
| 7 | vue-tsc --noEmit 通过 |
