# Phase 7: 报表+增值 — 系统设计文档

> **目标**: 报表真实化 + 物流/发票预留接口 + 小程序离线缓存

---

## 1. 后端：Analytics 聚合 API

在 server 新建 `modules/analytics/` 或直接在现有 product/order/finance 模块加聚合端点：

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| `GET` | `/analytics/order-trend` | `report:view` | 近30天每日订单数+金额 |
| `GET` | `/analytics/hot-skus` | `report:view` | 热销SKU Top 10 |
| `GET` | `/analytics/store-ranking` | `report:view` | 门店销售排名 |
| `GET` | `/analytics/summary` | `report:view` | 汇总：总订单/总金额/店均 |

查询基于 order + orderItem 聚合。

## 2. 前端改造

| 页面 | 改动 |
|------|------|
| admin Analytics.vue | 对接 /analytics/* 真实 API |
| admin Shipments.vue | +物流查询输入框（trackingNo→调第三方API预留） |
| admin Finance.vue | +电子发票申请按钮（预留接口） |
| miniapp report/sales.vue | 对接真实数据 |

## 3. 小程序离线缓存

`subpkg-common/api/request.ts` 增强：
- 商品列表 getSkus → 本地缓存 + `lastModified` 增量更新
- 弱网 Toast 提示 + 自动重试（最多 3 次）

## 4. 验收

| # | 条件 |
|---|------|
| 1 | Analytics 图表使用真实数据 |
| 2 | 小程序报表对接真实 API |
| 3 | 小程序商品数据离线缓存 |
| 4 | 物流/发票预留入口可见 |
| 5 | tsc + vue-tsc 通过 |
