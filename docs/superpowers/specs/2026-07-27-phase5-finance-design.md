# Phase 5: 采购+财务 — 系统设计文档

> **项目名称**: 核销食（hxfood）连锁餐饮管理系统
> **文档版本**: v1.0
> **创建日期**: 2026-07-27
> **依赖**: Phase 1-4
> **目标里程碑**: M5 — 财务闭环（充值+扣款+对账+还款 全链路通过）

---

## 1. 设计决策

| 决策点 | 选择 | 说明 |
|--------|------|------|
| **采购范围** | 财务聚焦 + 采购轻量 | 不建采购订单模块，用 inventory.inbound 替代采购入库 |
| **对账方式** | 月度对账快照表 | 新建 MonthlyReconciliation，可追溯可审计 |
| **充值** | 总部手动充值 | 支付模块新增 recharge 端点 |
| **逾期管理** | 手动触发 + 查询 | Receivable 超期标记为 overdue，提供过滤查询 |

---

## 2. 数据库设计

### 2.1 ReconciliationStatus 枚举

```prisma
enum ReconciliationStatus {
  pending
  confirmed
  disputed

  @@map("reconciliation_status_enum")
}
```

### 2.2 MonthlyReconciliation 表

```prisma
model MonthlyReconciliation {
  id              String                @id @default(uuid()) @db.Uuid
  brandId         String                @map("brand_id") @db.Uuid
  storeId         String                @map("store_id") @db.Uuid
  period          String                @db.VarChar(7)
  openingBalance  Int                   @map("opening_balance")
  totalRecharge   Int                   @map("total_recharge") @default(0)
  totalSpent      Int                   @map("total_spent") @default(0)
  totalRefund     Int                   @map("total_refund") @default(0)
  closingBalance  Int                   @map("closing_balance")
  expectedClose   Int                   @map("expected_close")
  hasDifference   Boolean               @default(false) @map("has_difference")
  status          ReconciliationStatus  @default(pending)
  confirmedBy     String?               @map("confirmed_by") @db.Uuid
  confirmedAt     DateTime?             @map("confirmed_at") @db.Timestamptz()
  createdAt       DateTime              @default(now()) @map("created_at") @db.Timestamptz()

  brand     Brand        @relation(fields: [brandId], references: [id])
  store     Organization @relation(fields: [storeId], references: [id])
  confirmer User?        @relation(fields: [confirmedBy], references: [id])

  @@unique([storeId, period])
  @@map("monthly_reconciliations")
}
```

---

## 3. 后端 API 设计

### 3.1 Payment 模块 — 充值

`POST /payment/recharge` `@RequirePermission('finance:manage')`

```typescript
{ storeId: string; amountFen: number; remark?: string }
→ 创建 StoreAccount.balance += amountFen + AccountTransaction(recharge)
```

### 3.2 Finance 模块 — 对账 + 逾期

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| `POST` | `/finance/reconciliation/generate` | `finance:manage` | 生成月度对账单（?period=2026-07） |
| `GET` | `/finance/reconciliation` | `finance:view` | 对账单列表（?storeId=&period=&status=） |
| `POST` | `/finance/reconciliation/:id/confirm` | `finance:manage` | 确认对账 |
| `GET` | `/finance/overdue` | `finance:view` | 逾期应收列表 |
| `POST` | `/finance/check-overdue` | `finance:manage` | 触发逾期检查 |

对账公式：`expectedClose = openingBalance + totalRecharge - totalSpent + totalRefund`
差异判定：`hasDifference = (closingBalance !== expectedClose)`

---

## 4. 前端改动

### 4.1 miniapp franchisee

| 页面 | 改动 |
|------|------|
| `payment/account.vue` | 增加充值记录列表（筛选 recharge 类型流水） |
| `payment/bill-list.vue` | 对接 /finance/my-transactions 真实数据 |

### 4.2 admin-hq

| 页面 | 改动 |
|------|------|
| **Reconciliation.vue** (新建) | 选择月份→生成对账单→列表→确认 |
| **Finance.vue** (改造) | +充值按钮 +逾期列表Tab |
| **Dashboard.vue** (改造) | +本月充值总额 +逾期应收卡片 |

---

## 5. 文件变更汇总

```
apps/server/
├── prisma/schema.prisma                    ← Modify: +MonthlyReconciliation
├── src/modules/
│   ├── payment/
│   │   ├── payment.controller.ts           ← Modify: +recharge
│   │   └── payment.service.ts              ← Modify: +recharge
│   ├── finance/
│   │   ├── finance.controller.ts           ← Modify: +5 endpoints
│   │   └── finance.service.ts              ← Modify: +对账/逾期

apps/miniapp/subpkg-franchisee/payment/
├── account.vue                             ← Modify
└── bill-list.vue                           ← Modify

apps/admin-hq/src/views/
├── Reconciliation.vue                      ← Create
├── Finance.vue                             ← Modify
└── Dashboard.vue                           ← Modify
```

---

## 6. 验收标准

| # | 条件 | 验证方式 |
|---|------|---------|
| 1 | 总部可为加盟店充值 | POST /payment/recharge → 余额增加 + 流水记录 |
| 2 | 加盟店可查看充值记录 | GET /finance/my-transactions 含 recharge |
| 3 | 总部可生成月度对账单 | POST /finance/reconciliation/generate → 各门店对账记录 |
| 4 | 公式差异自动标记 | 期末余额 ≠ 期初+充值-消费-退款 → hasDifference=true |
| 5 | 总部可确认对账 | POST /finance/reconciliation/:id/confirm |
| 6 | 逾期应收可查询 | GET /finance/overdue |
| 7 | tsc --noEmit 通过 | 无编译错误 |
