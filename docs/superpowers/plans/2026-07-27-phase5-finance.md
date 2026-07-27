# Phase 5: 采购+财务 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现 M5 财务闭环：充值 + 月度对账 + 逾期管理 + 前端页面

**Architecture:** 增强 payment 模块（充值）、finance 模块（对账生成/确认/逾期检查）、前端充值记录+对账管理

**Tech Stack:** NestJS 11, Prisma 5, TypeScript 5, PostgreSQL 16, Vue 3

## Global Constraints

- **金额存储**: 所有金额以"分"为单位，使用 INTEGER 类型
- **流水不可改**: account_transactions 只能 INSERT
- **API 路径前缀**: 所有 API 统一 `/api/v1/` 前缀

---

### Task 1: DB — MonthlyReconciliation 表

**Files:** Modify `apps/server/prisma/schema.prisma`

插入枚举（ReceivableStatus 之后）：
```prisma
enum ReconciliationStatus {
  pending
  confirmed
  disputed
  @@map("reconciliation_status_enum")
}
```

插入模型（文件末尾）：
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
  brand           Brand                 @relation(fields: [brandId], references: [id])
  store           Organization          @relation(fields: [storeId], references: [id])
  confirmer       User?                 @relation(fields: [confirmedBy], references: [id])
  @@unique([storeId, period])
  @@map("monthly_reconciliations")
}
```

添加 Brand/Organization/User 反向关系。

运行迁移 + 提交。

---

### Task 2: Payment 充值 + Finance 对账逾期

**Files:**
- Modify `apps/server/src/modules/payment/payment.service.ts` — 添加 `recharge(dto, brandId, operatorId)`
- Modify `apps/server/src/modules/payment/payment.controller.ts` — 添加 `POST /payment/recharge`
- Modify `apps/server/src/modules/finance/finance.service.ts` — 添加：
  - `generateReconciliation(brandId, period)` — 遍历品牌下所有活跃门店生成对账
  - `listReconciliations(brandId, params)` — 对账单列表
  - `confirmReconciliation(id, operatorId)` — 确认对账
  - `getOverdueReceivables(brandId)` — overdue 应收
  - `checkOverdue(brandId)` — 将到期未付标记为 overdue
- Modify `apps/server/src/modules/finance/finance.controller.ts` — 对应 5 个端点

recharge 核心逻辑：
```typescript
async recharge(dto: { storeId: string; amountFen: number; remark?: string }, brandId: string) {
  return this.prisma.$transaction(async (tx) => {
    const account = await tx.storeAccount.findUniqueOrThrow({ where: { storeId: dto.storeId } });
    const newBalance = account.balance + dto.amountFen;
    await tx.storeAccount.update({ where: { storeId: dto.storeId }, data: { balance: newBalance } });
    await tx.accountTransaction.create({ data: { brandId, storeId: dto.storeId, transType: 'recharge', amount: dto.amountFen, balanceAfter: newBalance, remark: dto.remark } });
    return { success: true, newBalance };
  });
}
```

编译 + 提交。

---

### Task 3: 前端改动

**Files:**
- Modify `apps/miniapp/subpkg-franchisee/payment/account.vue` — 增加充值记录列表
- Modify `apps/miniapp/subpkg-franchisee/payment/bill-list.vue` — 对接真实数据
- Create `apps/admin-hq/src/views/Reconciliation.vue` — 对账管理页面
- Modify `apps/admin-hq/src/views/Finance.vue` — +充值按钮 +逾期Tab
- Modify `apps/admin-hq/src/views/Dashboard.vue` — +充值总额+逾期卡片

编译验证 + 提交。

---

### Task 4: 构建验证

```bash
cd D:/hxfood/apps/server && npx tsc --noEmit && npx prisma generate
```

提交。

---

## 验收清单

| # | 条件 | 验证 |
|---|------|------|
| 1 | 总部可为加盟店充值 | POST /payment/recharge |
| 2 | 月度对账生成 | POST /finance/reconciliation/generate |
| 3 | 对账差异标记 | expectedClose ≠ closingBalance → disputed |
| 4 | 逾期应收查询 | GET /finance/overdue |
| 5 | tsc 编译通过 | 零错误 |
