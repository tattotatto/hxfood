# Phase 2: 商品+订货闭环 — 系统设计文档

> **项目**: 核销食（hxfood）连锁餐饮管理系统
> **文档版本**: v1.0
> **创建日期**: 2026-07-24
> **前置阶段**: Phase 1 基础设施 ✅

---

## 目录

1. [目标与范围](#1-目标与范围)
2. [核心流程](#2-核心流程)
3. [模块一: 商品中心 (product)](#3-模块一商品中心-product)
4. [模块二: 订单中心 (order)](#4-模块二订单中心-order)
5. [模块三: 支付集成 (payment)](#5-模块三支付集成-payment)
6. [修改文件清单](#6-修改文件清单)
7. [测试计划](#7-测试计划)
8. [验收标准](#8-验收标准)

---

## 1. 目标与范围

### 1.1 目标

实现 M2 里程碑 **"订货闭环"**：加盟店小程序浏览商品 → 下单 → 总部审核 → 支付 → 全链路通过。

### 1.2 范围（最小可跑通）

| ✅ 做 | ❌ 不做 |
|------|--------|
| SKU 列表查询（含价格+库存） | 商品 CRUD 管理后台 |
| 创建订单（幂等+服务端定价+快照） | 退款/退货流程 |
| 订单列表/详情（含状态时间线） | 微信支付 V3 真实对接 |
| 总部审核（批准/驳回） | 采购单/生产单/发货/收货 |
| 余额支付 + Mock 微信支付 | 前端页面完整开发 |

### 1.3 涉及模块

```
product (只读) → order (核心) → payment (支付)
```

---

## 2. 核心流程

```
加盟店小程序                    总部管理后台
─────────────                  ─────────────
GET /products/skus
  → SKU列表（含价格+库存）

POST /orders
  → 幂等校验 → 库存检查 → 服务端定价 → 订单快照
  → 创建订单(draft → pending_approval)

GET /orders                       GET /orders
  → 查看自己的订单                   → 查看品牌下待审核订单

                               POST /orders/:id/approve
                                 → pending_approval → approved
                                 → order_approvals 记录

                               POST /orders/:id/reject
                                 → pending_approval → rejected

POST /payment/pay
  → 余额: 直接扣款
  → 微信: 返回 mock prepayId
  → POST /payment/mock-confirm

GET /orders/:id
  → 订单详情（含状态时间线）
```

---

## 3. 模块一: 商品中心 (product)

### 3.1 状态

**无需改动**。Phase 2 需要的接口已全部就绪。

### 3.2 已有接口

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/products/skus` | `product:view` | SKU 列表，含价格策略解析 + 库存 |
| GET | `/products/skus/:id` | `product:view` | SKU 详情 + 有效价格 + 可用库存 |
| GET | `/products/categories` | `product:view` | 分类树 |
| POST | `/products/categories` | `product:manage` | 创建分类 |
| GET | `/products/spus` | `product:view` | SPU 列表 |
| POST | `/products/spus` | `product:manage` | 创建 SPU |
| GET | `/products/price-policies` | `product:manage` | 价格策略查询 |
| POST | `/products/price-policies` | `product:manage` | 创建价格策略 |

### 3.3 价格解析逻辑（已有，无需改动）

```
优先级: contract > promotion > store_level > default

resolvePrice(policies, storeId, basePrice):
  1. 过滤有效期内策略
  2. 按优先级依次匹配
  3. 命中则返回策略价格
  4. 无命中返回 SKU 基准价
```

---

## 4. 模块二: 订单中心 (order)

### 4.1 已有能力

- 创建订单：幂等键校验、库存检查、服务端定价快照、事务写入
- 订单列表/详情：分页查询、状态时间线
- 状态流转：approve/reject/cancel/receive
- 状态机：13 条转移规则，角色校验，终态判断

### 4.2 需修复的问题

#### 问题 1: 幂等键未持久化

**现状**: `createOrder` 只校验幂等键格式，不存储，无法防止重复提交。

**修复**: `orders` 表增加 `idempotency_key` 字段，创建前 `findUnique` 检查是否已存在。

**Schema 变更**:
```prisma
model Order {
  // ...existing fields...
  idempotencyKey String?  @unique @map("idempotency_key") @db.VarChar(64)
}
```

**Service 变更**:
```typescript
// createOrder 开头增加幂等检查
const existing = await tx.order.findUnique({
  where: { idempotencyKey: dto.idempotencyKey },
});
if (existing) {
  return this.formatOrder(existing); // 返回已有订单，幂等
}

// 创建时写入 idempotencyKey
const order = await tx.order.create({
  data: {
    // ...existing...
    idempotencyKey: dto.idempotencyKey,
  },
});
```

#### 问题 2: 事务不原子

**现状**: `createOrder` 在 Prisma 事务内创建订单，但后续 `transition` 方法在事务外执行，不是原子操作。

**修复**: `createOrder` 使用 `tx` 直接执行创建和状态流转，不调用外部 `this.transition`。

```typescript
// createOrder 内，订单创建后直接在事务内完成状态流转
const order = await tx.order.create({ ... });

// 直接在事务内处理 transition
await tx.orderStatusLog.create({
  data: {
    brandId, orderId: order.id,
    toStatus: 'pending_approval',
    operatorId: userId, remark: '提交订单',
  },
});

// 查询完成后返回
const created = await tx.order.findUnique({
  where: { id: order.id },
  include: { orderItems: true, orderStatusLogs: true },
});
return this.formatOrder(created);
```

#### 问题 3: 审核记录缺失

**现状**: approve/reject 只写 `order_status_logs`，不写 `order_approvals`。

**修复**: 审核操作同时写入 `order_approvals` 表。

```typescript
// transition 方法中，当 toStatus 为 approved 或 rejected 时
if (['approved', 'rejected', 'cancelled'].includes(toStatus)) {
  await this.prisma.orderApproval.create({
    data: {
      brandId: order.brandId,
      orderId: order.id,
      approverId: operatorId,
      approvalType: toStatus === 'approved' ? 'review' :
                    toStatus === 'rejected' ? 'reject' : 'cancel',
      comment: remark || '',
    },
  });
}
```

#### 问题 4: Controller DTO 缺少校验

**现状**: `createOrder` 的 `@Body() dto: any` 无类型校验。

**修复**: 新增 `CreateOrderDto` 类。

```typescript
// dto/create-order.dto.ts
import { IsString, IsArray, IsOptional, IsEnum, Matches, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty()
  @IsString()
  skuId: string;

  @ApiProperty()
  @Min(0.001)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6' })
  @IsString()
  @Matches(/^[a-f0-9]{32}$/)
  idempotencyKey: string;

  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({ enum: ['balance', 'wechat', 'credit', 'mixed'] })
  @IsString()
  paymentMethod: string;

  @ApiProperty({ required: false })
  @IsOptional()
  shippingAddress?: object;

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

### 4.3 修改文件

```
apps/server/src/modules/order/
├── dto/
│   └── create-order.dto.ts   ← 新增
├── order.service.ts          ← 修改: createOrder(幂等+原子), transition(+审核记录)
├── order.controller.ts       ← 修改: 使用 CreateOrderDto
└── order.state-machine.ts    ← 无需改动
```

---

## 5. 模块三: 支付集成 (payment)

### 5.1 已有能力

- `payByBalance` — 余额支付
- `createWechatPayment` — Mock 微信支付
- `handleWechatCallback` — 支付回调处理

### 5.2 设计方案

支付在**总部审核通过后**由前端显式发起：

```
approved → 前端调 POST /payment/pay →
  ├─ balance: 扣款 → 流水 → 返回成功
  └─ wechat: 返回 mock prepayId → mock-confirm 手动确认
```

### 5.3 新增接口

#### POST /payment/pay

统一支付入口，入参：

```typescript
// dto/pay.dto.ts
export class PayDto {
  @IsString()
  orderId: string;

  @IsString()
  paymentMethod: string;  // 'balance' | 'wechat'
}
```

```typescript
// payment.service.ts
async pay(dto: PayDto, brandId: string, storeId: string) {
  // 1. 查询订单，校验状态必须是 approved
  const order = await this.prisma.order.findUnique({
    where: { id: dto.orderId },
    include: { orderItems: true },
  });
  if (!order) throw new NotFoundException('Order not found');
  if (order.orderStatus !== 'approved') {
    throw new BadRequestException('Order must be approved before payment');
  }

  // 2. 分发到余额或微信
  if (dto.paymentMethod === 'balance') {
    return this.payByBalance(order.id, brandId, storeId, order.totalAmount);
  } else {
    return this.createWechatPayment(order.id, 'mock_openid', order.totalAmount, order.orderNo);
  }
}
```

#### POST /payment/mock-confirm

开发阶段手动确认微信支付：

```typescript
@Post('mock-confirm')
async mockConfirm(@Body() dto: { orderId: string }) {
  const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
  // 模拟回调处理
  return this.handleWechatCallback({
    out_trade_no: order.orderNo,
    transaction_id: `mock_txn_${Date.now()}`,
    amount: { total: order.totalAmount },
  }, '', '', '', '');
}
```

### 5.4 修改文件

```
apps/server/src/modules/payment/
├── dto/
│   └── pay.dto.ts            ← 新增
├── payment.controller.ts     ← 修改: POST /pay, POST /mock-confirm
└── payment.service.ts        ← 修改: pay()统一入口
```

---

## 6. 修改文件清单

### 新增文件

| # | 文件 |
|---|------|
| 1 | `apps/server/src/modules/order/dto/create-order.dto.ts` |
| 2 | `apps/server/src/modules/payment/dto/pay.dto.ts` |

### 修改文件

| # | 文件 | 改动内容 |
|---|------|---------|
| 1 | `apps/server/prisma/schema.prisma` | orders 表加 `idempotencyKey` 字段 |
| 2 | `apps/server/src/modules/order/order.service.ts` | 幂等检查、事务原子化、审核记录 |
| 3 | `apps/server/src/modules/order/order.controller.ts` | 使用 CreateOrderDto |
| 4 | `apps/server/src/modules/payment/payment.service.ts` | 新增 pay() 方法 |
| 5 | `apps/server/src/modules/payment/payment.controller.ts` | 新增 pay + mock-confirm 接口 |

### 数据库迁移

```bash
cd apps/server && npx prisma migrate dev --name add_idempotency_key
```

---

## 7. 测试计划

### 单元测试

| 测试项 | 说明 |
|--------|------|
| CreateOrderDto 校验 | 非法幂等键/空商品列表/负数量 应返回 400 |
| 幂等创建 | 同一幂等键两次调用返回相同订单 |
| 状态机校验 | 非 approved 状态支付应报错 |
| 审核记录写入 | approve/reject 后 order_approvals 有对应记录 |

### E2E 测试 — 核心链路

```
1. 加盟店登录 → 获取 token
2. GET /products/skus → 获取可用 SKU 列表
3. POST /orders → 下单（含幂等键）
4. GET /orders/:id → 确认订单详情
5. admin 登录 → POST /orders/:id/approve → 审核通过
6. POST /payment/pay → 余额支付
7. GET /orders/:id → 确认支付完成
```

### E2E 测试 — 边界场景

| 场景 | 预期 |
|------|------|
| 库存不足下单 | 400 "insufficient stock" |
| 未审核订单支付 | 400 "must be approved" |
| 重复幂等键下单 | 200 返回首次订单 |
| store01 审核订单 | 403（无 order:approve 权限） |
| 审核后取消 | 200，状态变 cancelled |

---

## 8. 验收标准

| # | 验收项 | 标准 |
|---|--------|------|
| 1 | 幂等下单 | 同一幂等键多次提交返回相同结果 |
| 2 | 服务端定价 | 订单价格由服务端从 price_policies 计算，不信任客户端 |
| 3 | 订单快照 | order_items 记录下单时的 sku_code/sku_name/unit_price |
| 4 | 库存校验 | 库存不足时拒绝下单 |
| 5 | 状态机运转 | draft→pending_approval→approved→(支付) 全链路跑通 |
| 6 | 审核记录 | order_approvals 正确记录每次审核操作 |
| 7 | 余额支付 | 支付后余额正确扣减，流水记录完整 |
| 8 | Mock 微信支付 | mock-confirm 能正确确认支付 |
| 9 | E2E 全量 | 7 个正常用例 + 5 个边界用例全部 PASS |
| 10 | 编译通过 | `pnpm run build` 全量成功 |

---

> 📁 文档路径: `docs/superpowers/specs/2026-07-24-phase2-product-ordering-design.md`
>
> 🔄 下一步: 进入实现计划阶段（invoke writing-plans skill）
