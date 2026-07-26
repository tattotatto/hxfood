# Phase 4: 库存+生产+发货+收货 — 系统设计文档

> **项目名称**: 核销食（hxfood）连锁餐饮管理系统
> **文档版本**: v1.0
> **创建日期**: 2026-07-27
> **依赖**: Phase 1（基础设施）、Phase 2（订货闭环）、Phase 3（加盟+小程序）
> **目标里程碑**: M4 — 供应链闭环（订单→生产→发货→收货 全链路通过）

---

## 目录

1. [设计决策](#1-设计决策)
2. [数据库设计](#2-数据库设计)
3. [发货状态机](#3-发货状态机)
4. [后端 API 设计](#4-后端-api-设计)
5. [前端改动](#5-前端改动)
6. [文件变更汇总](#6-文件变更汇总)
7. [验收标准](#7-验收标准)

---

## 1. 设计决策

| 决策点 | 选择 | 说明 |
|--------|------|------|
| **发货数据模型** | 新建 `Shipment` 表 + 复用 `InTransitInventory` | 和 Order/OrderItem 模式一致，职责分离 |
| **前端范围** | 聚焦后端 + 关键页面 | shipment/production API + franchisee 收货 + admin 发货/生产管理 |
| **分批发货** | 支持 | 同一订单可多个 Shipment，订单状态 partially_shipped |
| **库存扣减时机** | 发货时实扣 | 审核通过时 lockStock → 发货时 deductStock + 写入在途 |

---

## 2. 数据库设计

### 2.1 新枚举：ShipmentStatus

```prisma
enum ShipmentStatus {
  pending
  shipped
  partially_received
  received
  cancelled

  @@map("shipment_status_enum")
}
```

### 2.2 新表：Shipment

```prisma
model Shipment {
  id              String          @id @default(uuid()) @db.Uuid
  brandId         String          @map("brand_id") @db.Uuid
  shipmentNo      String          @unique @map("shipment_no") @db.VarChar(32)
  orderId         String          @map("order_id") @db.Uuid
  fromWarehouseId String          @map("from_warehouse_id") @db.Uuid
  toStoreId       String          @map("to_store_id") @db.Uuid
  status          ShipmentStatus  @default(pending)
  carrier         String?         @db.VarChar(100)
  trackingNo      String?         @map("tracking_no") @db.VarChar(100)
  shippedAt       DateTime?       @map("shipped_at") @db.Timestamptz()
  receivedAt      DateTime?       @map("received_at") @db.Timestamptz()
  notes           String?         @db.Text
  createdBy       String          @map("created_by") @db.Uuid
  createdAt       DateTime        @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt       DateTime        @updatedAt @map("updated_at") @db.Timestamptz()

  brand         Brand              @relation(fields: [brandId], references: [id])
  order         Order              @relation(fields: [orderId], references: [id])
  fromWarehouse Warehouse          @relation(fields: [fromWarehouseId], references: [id])
  toStore       Organization       @relation(fields: [toStoreId], references: [id])
  createdByUser User               @relation(fields: [createdBy], references: [id])
  inTransits    InTransitInventory[]

  @@index([orderId])
  @@index([brandId, status, createdAt(sort: Desc)])
  @@map("shipments")
}
```

### 2.3 InTransitInventory 补充 Shipment 关系

```prisma
model InTransitInventory {
  // ... existing fields ...
  shipment   Shipment @relation(fields: [shipmentId], references: [id])
}
```

### 2.4 关联模型补充

```prisma
model Order {
  // ... existing fields ...
  shipments Shipment[]
}
```

---

## 3. 发货状态机

### 3.1 状态流转图

```
                    ┌──────────────┐
                    │   pending    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │ 取消        │  发货      │
              ▼            ▼            │
       ┌──────────┐  ┌──────────┐      │
       │ cancelled │  │ shipped  │      │
       └──────────┘  └────┬─────┘      │
                          │ 加盟店签收  │
                          ▼            │
                 ┌──────────────────┐  │
                 │partially_received│──┘
                 └────────┬─────────┘
                          │ 全部签收
                          ▼
                   ┌──────────┐
                   │ received │  ← 终态
                   └──────────┘
```

### 3.2 转换规则

| 从 | 到 | 操作者 | 前置条件 |
|----|-----|--------|---------|
| `pending` | `shipped` | CK管理员 | inTransit 明细行全部有数量 |
| `pending` | `cancelled` | CK管理员 | — |
| `shipped` | `partially_received` | 加盟店 | 部分明细行签收 |
| `shipped` | `received` | 加盟店 | 全部明细行签收 |
| `partially_received` | `received` | 加盟店 | 剩余明细行全部签收 |

### 3.3 订单状态联动

| Shipment 事件 | 订单状态变更 |
|---------------|-------------|
| 首次 shipping | produced → shipped（全部发完）或 partially_shipped（部分） |
| 后续 shipping | partially_shipped 保持 |
| 全部 shipment received | partially_shipped/shipped → received |
| 部分 shipment received | shipped → partially_shipped |

---

## 4. 后端 API 设计

### 4.1 Shipment 模块（新建）

```
apps/server/src/modules/shipment/
├── shipment.module.ts
├── shipment.controller.ts
├── shipment.service.ts
└── dto/
    ├── create-shipment.dto.ts
    ├── ship.dto.ts
    └── receive.dto.ts
```

### 4.2 API 端点

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| `POST` | `/shipment` | `inventory:manage` | 创建发货单（选订单+仓库+商品明细） |
| `GET` | `/shipment` | `inventory:view` | 发货单列表（?orderId=&status=&page=&pageSize=） |
| `GET` | `/shipment/:id` | `inventory:view` | 发货单详情（含 inTransit 明细+订单信息） |
| `POST` | `/shipment/:id/ship` | `inventory:manage` | 执行发货（扣库存→在途→更新订单状态） |
| `POST` | `/shipment/:id/receive` | `product:view` | 加盟店签收（按明细行：{items: [{skuId,qty}]}） |
| `POST` | `/shipment/:id/cancel` | `inventory:manage` | 取消发货单（仅 pending 状态） |

### 4.3 ship 事务逻辑

```
1. 校验 shipment.status === 'pending'
2. 校验订单状态为 produced 或 partially_shipped
3. 遍历 inTransit 明细行:
   a. inventory.deductStock(FIFO 实扣)
   b. 更新 InTransitInventory.status → 'in_transit'
4. 更新 shipment → shipped
5. 检查订单下所有 shipment:
   - 全部 shipped → order → shipped
   - 部分 shipped → order → partially_shipped
   - 记录 OrderStatusLog
```

### 4.4 receive 事务逻辑

```
1. 校验 shipment 属于当前 store
2. 遍历接收明细 {skuId, qty}:
   a. 更新 InTransitInventory: status→received, receivedAt
3. 检查 shipment 下是否还有 in_transit 明细:
   - 全签 → shipment → received
   - 部分 → shipment → partially_received
4. 检查订单下全部 shipment:
   - 全 received → order → received, receivedAt
5. 记录 OrderStatusLog
```

### 4.5 Production 模块补充

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| `GET` | `/production/orders` | `production:view` | 工单列表（?status=pending_production...） |
| `POST` | `/production/orders/:orderId/start` | `production:manage` | 开始生产（→ in_production） |
| `POST` | `/production/orders/:orderId/complete` | `production:manage` | 生产完成入库（增强：支持部分批次） |

### 4.6 库存锁/解锁触发器

修改 order 模块——当订单状态变更时自动触发：

| 状态变更 | 触发 |
|---------|------|
| pending_approval → approved | inventory.lockStock(orderId) |
| * → cancelled | inventory.unlockStock(orderId) |

---

## 5. 前端改动

### 5.1 miniapp franchisee（1 页新增 + 1 页改造）

| 页面 | 路径 | 改动 |
|------|------|------|
| **订单详情** | `order/detail.vue` | 加发货单列表（在途信息+物流单号）+ 底部"确认收货"按钮 |
| **收货确认** | `order/receive.vue` | 选择发货单→逐行输入实收数量→调 receive API |

### 5.2 admin-hq（3 页新增/改造）

| 页面 | 改动 |
|------|------|
| **Shipments.vue** (新建) | 发货单列表 + 创建发货单表单 + 发货/取消操作 |
| **Production.vue** (新建) | 生产工单列表 + 开始生产 + 入库登记 |
| **Orders.vue** (改造) | 订单详情加"发货单"Tab |

---

## 6. 文件变更汇总

```
apps/server/
├── prisma/
│   ├── schema.prisma                    ← Modify: +Shipment +ShipmentStatus
│   └── migrations/
└── src/modules/
    ├── shipment/                        ← Create (新模块)
    │   ├── shipment.module.ts
    │   ├── shipment.controller.ts
    │   ├── shipment.service.ts
    │   └── dto/
    │       ├── create-shipment.dto.ts
    │       ├── ship.dto.ts
    │       └── receive.dto.ts
    ├── production/
    │   ├── production.controller.ts     ← Modify: +list/start
    │   └── production.service.ts        ← Modify: +partial complete
    ├── order/
    │   └── order.service.ts             ← Modify: +库存锁/解锁触发器
    └── app.module.ts                    ← Modify: +ShipmentModule

apps/miniapp/subpkg-franchisee/order/
├── detail.vue                           ← Modify: +发货信息+收货按钮
└── receive.vue                          ← Create

apps/admin-hq/src/views/
├── Shipments.vue                        ← Create
├── Production.vue                       ← Create
└── Orders.vue                           ← Modify: +发货单Tab
```

---

## 7. 验收标准

匹配 M4 里程碑"供应链闭环"——**订单→生产→发货→收货 全链路通过**：

| # | 验收条件 | 验证方式 |
|---|---------|---------|
| 1 | CK管理员可查看待生产订单列表 | GET /production/orders |
| 2 | CK管理员可开始/完成生产，自动入库 | POST production start/complete → inventory 有数据 |
| 3 | 创建发货单可选择已生产订单和商品 | POST /shipment，关联 InTransitInventory |
| 4 | 执行发货实扣库存（FIFO） | POST /shipment/:id/ship → inventory quantity 减少 |
| 5 | 加盟店可看到在途发货单并签收 | GET shipment by store → POST receive |
| 6 | 全部签收后订单状态 → received | 自动触发 order update |
| 7 | 分批发货场景：partially_shipped → 全部签收 → received | 多 shipment 完整链路 |
| 8 | tsc --noEmit 通过 | 无编译错误 |
