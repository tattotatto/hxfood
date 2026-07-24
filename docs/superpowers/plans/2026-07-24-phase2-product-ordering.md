# Phase 2: 商品+订货闭环 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 M2 订货闭环：修复订单模块的幂等/原子性/审核记录问题，新增支付统一入口和 Mock 确认接口。

**Architecture:** 在现有骨架代码上做增量修复。order 模块已有 createOrder/transition/findOrders 等核心逻辑，只需修补 4 个缺口。payment 模块已有 payByBalance 和 wechat callback 处理，只需加一个统一入口。

**Tech Stack:** NestJS 11, Prisma 5, TypeScript 5, PostgreSQL 16

## Global Constraints

- **金额存储**: 所有金额以"分"为单位，使用 INTEGER 类型
- **品牌隔离**: Prisma Extension 自动注入 brand_id，业务代码无需手动处理
- **订单快照**: order_items 冗余 sku_code/sku_name/unit_price
- **幂等**: 下单接口使用 idempotencyKey 防止重复提交
- **审核记录**: order_approvals 表记录每次审核操作（Append-Only）
- **API 路径前缀**: 所有 API 统一 `/api/v1/` 前缀

---

## 文件结构

```
apps/server/
├── prisma/
│   └── schema.prisma                    ← Modify: Order 加 idempotencyKey
│
└── src/
    └── modules/
        ├── order/
        │   ├── dto/
        │   │   └── create-order.dto.ts  ← Create
        │   ├── order.service.ts         ← Modify
        │   └── order.controller.ts      ← Modify
        │
        └── payment/
            ├── dto/
            │   └── pay.dto.ts           ← Create
            ├── payment.service.ts       ← Modify
            └── payment.controller.ts    ← Modify
```

---

### Task 1: 数据库迁移 — orders 表加 idempotencyKey

**Files:**
- Modify: `apps/server/prisma/schema.prisma`

**Interfaces:**
- Produces: `Order.idempotencyKey` 字段，`@unique @db.VarChar(64)`，可为 null（兼容历史数据）
- Consumes: 无

- [ ] **Step 1: 在 schema.prisma 的 Order 模型中添加 idempotencyKey 字段**

在 `createdBy` 字段之后添加：

```prisma
idempotencyKey  String?       @unique @map("idempotency_key") @db.VarChar(64)
```

完整插入位置（`createdBy` 行后）：

```diff
  createdBy       String        @map("created_by") @db.Uuid
+ idempotencyKey  String?       @unique @map("idempotency_key") @db.VarChar(64)
  submittedAt     DateTime?     @map("submitted_at") @db.Timestamptz()
```

- [ ] **Step 2: 运行 Prisma 迁移**

```bash
cd D:/hxfood/apps/server && npx prisma migrate dev --name add_idempotency_key
```

Expected: 迁移文件生成，数据库列添加成功。

- [ ] **Step 3: 重新生成 Prisma Client**

```bash
cd D:/hxfood/apps/server && npx prisma generate
```

Expected: `@prisma/client` 类型更新，`Order.idempotencyKey` 可用。

- [ ] **Step 4: 验证编译**

```bash
cd D:/hxfood && pnpm run build
```

Expected: 编译通过。

- [ ] **Step 5: Commit**

```bash
git add apps/server/prisma/schema.prisma apps/server/prisma/migrations/
git commit -m "feat: add idempotencyKey to Order model"
```

---

### Task 2: 创建 CreateOrderDto

**Files:**
- Create: `apps/server/src/modules/order/dto/create-order.dto.ts`

**Interfaces:**
- Produces: `CreateOrderDto` 类（含 class-validator 校验）
- Consumes: 无

- [ ] **Step 1: 创建 DTO 文件**

```typescript
// apps/server/src/modules/order/dto/create-order.dto.ts
import { IsString, IsArray, IsOptional, Min, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({ example: 'uuid-of-sku' })
  @IsString()
  skuId: string;

  @ApiProperty({ example: 1.5 })
  @Min(0.001)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6' })
  @IsString()
  @Matches(/^[a-f0-9]{32}$/, { message: 'Invalid idempotency key format' })
  idempotencyKey: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({ enum: ['balance', 'wechat', 'credit', 'mixed'] })
  @IsString()
  paymentMethod: string;

  @ApiProperty({ required: false })
  @IsOptional()
  shippingAddress?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  expectedAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
```

- [ ] **Step 2: 验证编译**

```bash
cd D:/hxfood && pnpm run build
```

Expected: 编译通过（此时尚未引用，不会报错）。

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/modules/order/dto/create-order.dto.ts
git commit -m "feat: add CreateOrderDto with validation"
```

---

### Task 3: 创建 PayDto

**Files:**
- Create: `apps/server/src/modules/payment/dto/pay.dto.ts`

**Interfaces:**
- Produces: `PayDto` 类
- Consumes: 无

- [ ] **Step 1: 创建 DTO 文件**

```typescript
// apps/server/src/modules/payment/dto/pay.dto.ts
import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PayDto {
  @ApiProperty({ example: 'uuid-of-order' })
  @IsString()
  orderId: string;

  @ApiProperty({ enum: ['balance', 'wechat'] })
  @IsString()
  @IsIn(['balance', 'wechat'], { message: 'paymentMethod must be balance or wechat' })
  paymentMethod: string;
}
```

- [ ] **Step 2: 验证编译**

```bash
cd D:/hxfood && pnpm run build
```

Expected: 编译通过。

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/modules/payment/dto/pay.dto.ts
git commit -m "feat: add PayDto"
```

---

### Task 4: 修复订单服务 — 幂等、原子事务、审核记录

**Files:**
- Modify: `apps/server/src/modules/order/order.service.ts`

**Interfaces:**
- Consumes: `CreateOrderDto` from Task 2, `Order.idempotencyKey` from Task 1
- Produces: 修复后的 `createOrder`（幂等检查 + 原子事务）、修复后的 `transition`（审核记录写入）

- [ ] **Step 1: 修改 createOrder — 增加幂等键检查**

在 `createOrder` 方法开头，idempotencyKey 校验之后，订单号生成之前，插入幂等检查：

在事务内 `tx.order.create` 之前加：

```typescript
// 幂等检查：已存在的幂等键直接返回已有订单
const existing = await this.prisma.order.findUnique({
  where: { idempotencyKey: dto.idempotencyKey },
  include: { orderItems: true, orderStatusLogs: { orderBy: { createdAt: 'asc' } } },
});
if (existing) {
  return this.formatOrder(existing);
}
```

- [ ] **Step 2: 修改 createOrder — 创建时写入幂等键 + 原子事务内完成 transition**

将事务内 `tx.order.create` 的 data 加上 `idempotencyKey`，并将 `return this.transition(...)` 改为事务内直接操作：

将：
```typescript
return this.transition(order.id, 'pending_approval', userId, 'store_admin', '提交订单');
```

替换为：
```typescript
// 原子事务内完成：创建订单 + 状态日志
await tx.orderStatusLog.create({
  data: {
    brandId,
    orderId: order.id,
    toStatus: 'pending_approval' as any,
    operatorId: userId,
    remark: '提交订单',
  },
});

const created = await tx.order.findUnique({
  where: { id: order.id },
  include: { orderItems: true, orderStatusLogs: { orderBy: { createdAt: 'asc' } } },
});
if (!created) throw new BadRequestException('Order creation failed');
return this.formatOrder(created);
```

同时在 `tx.order.create` 的 data 中加上幂等键：
```typescript
const order = await tx.order.create({
  data: {
    // ...existing fields...
    idempotencyKey: dto.idempotencyKey,  // ← 新增
  },
});
```

- [ ] **Step 3: 修改 transition — 审核操作写入 order_approvals**

在 `transition` 方法的 `const updated = await this.prisma.order.update(...)` 之前插入审核记录逻辑：

```typescript
// 审核记录：审核/驳回/取消操作写入 order_approvals
if (['approved', 'rejected'].includes(toStatus)) {
  await this.prisma.orderApproval.create({
    data: {
      brandId: order.brandId,
      orderId: order.id,
      approverId: operatorId,
      approvalType: toStatus === 'approved' ? 'review' : 'reject',
      comment: remark || null,
    },
  });
}

if (toStatus === 'cancelled') {
  await this.prisma.orderApproval.create({
    data: {
      brandId: order.brandId,
      orderId: order.id,
      approverId: operatorId,
      approvalType: 'cancel',
      comment: remark || null,
    },
  });
}
```

- [ ] **Step 4: 添加 DTO 类型 import**

在文件头部添加：
```typescript
import { CreateOrderDto } from './dto/create-order.dto';
```

`createOrder` 方法签名改为：
```typescript
async createOrder(
  dto: CreateOrderDto,
  brandId: string,
  storeId: string,
  userId: string,
)
```

- [ ] **Step 5: 完整 diff 检查**

确认最终 `order.service.ts` 包含以上所有修改。

- [ ] **Step 6: 验证编译**

```bash
cd D:/hxfood && pnpm run build
```

Expected: 编译通过。

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/modules/order/order.service.ts
git commit -m "fix(order): add idempotency check, atomic transaction, approval records"
```

---

### Task 5: 修复订单控制器 — 使用 CreateOrderDto 类型

**Files:**
- Modify: `apps/server/src/modules/order/order.controller.ts`

**Interfaces:**
- Consumes: `CreateOrderDto` from Task 2, 修复后的 `OrderService` from Task 4

- [ ] **Step 1: 修改 createOrder 方法签名**

将：
```typescript
async createOrder(
  @Body() dto: any,
  @BrandContext() ctx: any,
  @CurrentUser() user: JwtPayload,
) {
```

改为：
```typescript
async createOrder(
  @Body() dto: CreateOrderDto,
  @BrandContext() ctx: any,
  @CurrentUser() user: JwtPayload,
) {
```

- [ ] **Step 2: 添加 import**

```typescript
import { CreateOrderDto } from './dto/create-order.dto';
```

- [ ] **Step 3: 验证编译**

```bash
cd D:/hxfood && pnpm run build
```

Expected: 编译通过。

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/modules/order/order.controller.ts
git commit -m "fix(order): use typed CreateOrderDto in controller"
```

---

### Task 6: 新增支付统一入口服务

**Files:**
- Modify: `apps/server/src/modules/payment/payment.service.ts`

**Interfaces:**
- Consumes: `PayDto` from Task 3, PrismaService
- Produces: `pay()` 方法 — 分发到余额支付或微信支付

- [ ] **Step 1: 在 payment.service.ts 中添加 pay() 方法**

在 `payByBalance` 方法之前插入：

```typescript
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PayDto } from './dto/pay.dto';

// 在 constructor 之后，现有方法之前添加：

async pay(dto: PayDto, brandId: string, storeId: string) {
  // 查询订单，校验状态
  const order = await this.prisma.order.findUnique({
    where: { id: dto.orderId, brandId },
    include: { orderItems: true },
  });
  if (!order) throw new NotFoundException('Order not found');
  if (order.orderStatus !== 'approved') {
    throw new BadRequestException('Order must be approved before payment');
  }

  // 分发到余额或微信
  if (dto.paymentMethod === 'balance') {
    return this.payByBalance(order.id, brandId, storeId, order.totalAmount);
  } else {
    // Mock 微信支付
    return this.createWechatPayment(order.id, 'mock_openid', order.totalAmount, order.orderNo);
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
cd D:/hxfood && pnpm run build
```

Expected: 编译通过。

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/modules/payment/payment.service.ts
git commit -m "feat(payment): add unified pay() method"
```

---

### Task 7: 新增支付控制器接口 + Mock 确认

**Files:**
- Modify: `apps/server/src/modules/payment/payment.controller.ts`

**Interfaces:**
- Consumes: `PayDto` from Task 3, 修复后的 `PaymentService` from Task 6
- Produces: `POST /payment/pay`, `POST /payment/mock-confirm`

- [ ] **Step 1: 修改 payment.controller.ts**

```typescript
import { Controller, Post, Body, Headers } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Public } from '../../common/decorators/public';
import { RequirePermission } from '../../common/decorators/require-permission';
import { BrandContext } from '../../common/decorators/brand-context';
import { PayDto } from './dto/pay.dto';

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  /** 统一支付入口 — 加盟店审核通过后发起 */
  @Post('pay')
  @RequirePermission('order:create')
  async pay(@Body() dto: PayDto, @BrandContext() ctx: any) {
    return this.paymentService.pay(dto, ctx.brandId, ctx.orgId);
  }

  /** Mock 微信支付确认 — 开发阶段手动确认 */
  @Post('mock-confirm')
  @RequirePermission('order:create')
  async mockConfirm(@Body('orderId') orderId: string) {
    return this.paymentService.handleWechatCallback(
      { out_trade_no: orderId, transaction_id: `mock_txn_${Date.now()}`, amount: { total: 0 } },
      '', '', '', '',
    );
  }

  /** 微信支付回调 — 公开接口（原接口保留不变） */
  @Public()
  @Post('callback/wechat')
  async wechatCallback(
    @Body() body: any,
    @Headers('wechatpay-signature') signature: string,
    @Headers('wechatpay-serial') serial: string,
    @Headers('wechatpay-timestamp') timestamp: string,
    @Headers('wechatpay-nonce') nonce: string,
  ) {
    return this.paymentService.handleWechatCallback(body, signature, serial, timestamp, nonce);
  }
}
```

- [ ] **Step 2: 验证编译**

```bash
cd D:/hxfood && pnpm run build
```

Expected: 编译通过。

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/modules/payment/payment.controller.ts
git commit -m "feat(payment): add /pay and /mock-confirm endpoints"
```

---

### Task 8: 全量编译验证

- [ ] **Step 1: 运行全量编译**

```bash
cd D:/hxfood && pnpm run build
```

Expected: 所有包编译通过，无类型错误。

- [ ] **Step 2: 运行 shared-utils 单元测试**

```bash
cd D:/hxfood/packages/shared-utils && pnpm run test
```

Expected: 10 个测试用例全部 PASS。

- [ ] **Step 3: 检查 Prisma 迁移状态**

```bash
cd D:/hxfood/apps/server && npx prisma migrate status
```

Expected: 迁移全部已应用，无 pending 迁移。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: Phase 2 final build verification passed"
```

---

## Phase 2 完成标志

```
✅ DB 迁移: orders 表 idempotencyKey 字段
✅ CreateOrderDto + class-validator 校验
✅ PayDto 统一支付入参
✅ 订单幂等: 同一幂等键不可重复创建
✅ 原子事务: createOrder 内完成创建+状态流转
✅ 审核记录: approve/reject/cancel 写入 order_approvals
✅ 支付统一入口: POST /payment/pay
✅ Mock 确认: POST /payment/mock-confirm
✅ pnpm run build 全量通过
```
