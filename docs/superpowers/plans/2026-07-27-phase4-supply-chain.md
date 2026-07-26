# Phase 4: 库存+生产+发货+收货 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现 M4 供应链闭环：Shipment 发货模块 + 生产工单增强 + 订单状态机接入库存锁/解锁 + 加盟店收货 + 后台发货/生产管理

**Architecture:** 新建 shipment 模块承载发货全生命周期（创建→扣库存→在途→签收）；增强 production 模块（列表/开始/分批次完成）；order 模块集成库存触发器；前端新增收货确认页和后台生产/发货管理页

**Tech Stack:** NestJS 11, Prisma 5, TypeScript 5, PostgreSQL 16, Vue 3 (uni-app/admin)

## Global Constraints

- **金额存储**: 所有金额以"分"为单位，使用 INTEGER 类型
- **品牌隔离**: Prisma Extension 自动注入 brand_id
- **流水不可改**: inventory_transactions 和 account_transactions 只能 INSERT
- **API 路径前缀**: 所有 API 统一 `/api/v1/` 前缀
- **批次贯穿全链**: lot_no 贯穿入库→库存→出库→订单

---

### Task 1: 数据库迁移 — Shipment 表

**Files:**
- Modify: `apps/server/prisma/schema.prisma`

**Interfaces:**
- Produces: `ShipmentStatus` enum + `Shipment` model + InTransitInventory/Order 关系

- [ ] **Step 1: 在 schema.prisma 枚举区添加 ShipmentStatus**

在 `InTransitStatus` 枚举之后（约第 149 行）插入：

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

- [ ] **Step 2: 在模型区末尾添加 Shipment 模型**

在 `Receivable` 之后（`@@map("receivables")` 后）插入：

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

- [ ] **Step 3: 添加 Order.shipments 关系**

在 Order 模型 `inTransitInventories InTransitInventory[]` 之后添加：

```prisma
  shipments         Shipment[]
```

- [ ] **Step 4: 运行迁移**

```bash
cd D:/hxfood/apps/server && npx prisma migrate dev --name add_shipment
```

- [ ] **Step 5: 提交**

```bash
git add apps/server/prisma/
git commit -m "feat: add Shipment model and ShipmentStatus enum"
```

---

### Task 2: Shipment DTOs

**Files:**
- Create: `apps/server/src/modules/shipment/dto/create-shipment.dto.ts`
- Create: `apps/server/src/modules/shipment/dto/ship.dto.ts`
- Create: `apps/server/src/modules/shipment/dto/receive.dto.ts`

- [ ] **Step 1: 创建 create-shipment.dto.ts**

```typescript
import { IsString, IsArray, ValidateNested, IsNumber, IsOptional, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

class ShipmentItemDto {
  @IsString()
  skuId: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsString()
  lotNo?: string;
}

export class CreateShipmentDto {
  @IsString()
  orderId: string;

  @IsString()
  fromWarehouseId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipmentItemDto)
  items: ShipmentItemDto[];

  @IsOptional()
  @IsString()
  carrier?: string;

  @IsOptional()
  @IsString()
  trackingNo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

- [ ] **Step 2: 创建 ship.dto.ts**

```typescript
import { IsOptional, IsString } from 'class-validator';

export class ShipDto {
  @IsOptional()
  @IsString()
  carrier?: string;

  @IsOptional()
  @IsString()
  trackingNo?: string;
}
```

- [ ] **Step 3: 创建 receive.dto.ts**

```typescript
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ReceiveItemDto {
  @IsString()
  skuId: string;

  @IsNumber()
  qty: number;
}

export class ReceiveDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemDto)
  items: ReceiveItemDto[];
}
```

- [ ] **Step 4: 提交**

```bash
git add apps/server/src/modules/shipment/dto/
git commit -m "feat: add shipment DTOs"
```

---

### Task 3: Shipment Service

**Files:**
- Create: `apps/server/src/modules/shipment/shipment.service.ts`

Complete service code covering all 6 operations + shipment number generation:

```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { ShipDto } from './dto/ship.dto';
import { ReceiveDto } from './dto/receive.dto';

@Injectable()
export class ShipmentService {
  constructor(private prisma: PrismaService) {}

  /** 生成发货单号: SH + 日期 + 自增 */
  private async generateShipmentNo(brandId: string): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.shipment.count({
      where: { brandId, createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } },
    });
    return `SH${date}${String(count + 1).padStart(4, '0')}`;
  }

  /** 创建发货单 */
  async createShipment(dto: CreateShipmentDto, brandId: string, operatorId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { orderItems: true, store: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!['produced', 'partially_shipped'].includes(order.orderStatus)) {
      throw new BadRequestException(`Cannot ship order in status: ${order.orderStatus}`);
    }

    const shipmentNo = await this.generateShipmentNo(brandId);

    return this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.create({
        data: {
          brandId,
          shipmentNo,
          orderId: dto.orderId,
          fromWarehouseId: dto.fromWarehouseId,
          toStoreId: order.storeId,
          carrier: dto.carrier,
          trackingNo: dto.trackingNo,
          notes: dto.notes,
          createdBy: operatorId,
          status: 'pending',
        },
      });

      for (const item of dto.items) {
        const orderItem = order.orderItems.find(oi => oi.skuId === item.skuId);
        await tx.inTransitInventory.create({
          data: {
            brandId,
            shipmentId: shipment.id,
            orderId: dto.orderId,
            skuId: item.skuId,
            lotNo: item.lotNo || '',
            quantity: item.quantity,
            status: 'in_transit',
          },
        });
      }

      return shipment;
    });
  }

  /** 发货单列表 */
  async listShipments(brandId: string, params: { orderId?: string; status?: string; page?: number; pageSize?: number }) {
    const where: any = { brandId };
    if (params.orderId) where.orderId = params.orderId;
    if (params.status) where.status = params.status;
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;

    const [items, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        include: { order: { select: { id: true, orderNo: true } }, fromWarehouse: { select: { id: true, name: true } }, toStore: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.shipment.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** 发货单详情 */
  async getShipment(id: string) {
    const s = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        order: { select: { id: true, orderNo: true, orderStatus: true } },
        fromWarehouse: { select: { id: true, name: true } },
        toStore: { select: { id: true, name: true } },
        inTransits: { include: { sku: { select: { id: true, skuCode: true, spu: { select: { name: true } } } } } },
      },
    });
    if (!s) throw new NotFoundException('Shipment not found');
    return s;
  }

  /** 执行发货（扣库存→标记在途→更新订单） */
  async ship(id: string, dto: ShipDto, operatorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.findUnique({
        where: { id, status: 'pending' },
        include: { inTransits: true, order: true },
      });
      if (!shipment) throw new NotFoundException('Shipment not found or not in pending status');

      // 校验订单状态
      if (!['produced', 'partially_shipped'].includes(shipment.order.orderStatus)) {
        throw new BadRequestException('Order not ready for shipping');
      }

      // 扣库存 (FIFO)
      for (const item of shipment.inTransits) {
        const batches = await tx.inventory.findMany({
          where: { skuId: item.skuId, warehouseId: shipment.fromWarehouseId, brandId: shipment.brandId },
          orderBy: [{ expiryAt: 'asc' }, { producedAt: 'asc' }],
        });

        let remaining = item.quantity;
        for (const batch of batches) {
          if (remaining <= 0) break;
          const available = batch.quantity;
          const deductQty = Math.min(available, remaining);
          if (deductQty <= 0) continue;

          await tx.inventory.update({
            where: { id: batch.id },
            data: { quantity: batch.quantity - deductQty, updatedAt: new Date() },
          });

          await tx.inventoryTransaction.create({
            data: {
              brandId: shipment.brandId, warehouseId: batch.warehouseId, skuId: batch.skuId,
              lotNo: batch.lotNo, transType: 'sale_out', quantity: -deductQty,
              balanceAfter: batch.quantity - deductQty,
              bizType: 'shipment', bizNo: shipment.shipmentNo, operatorId,
            },
          });

          remaining -= deductQty;
        }
        if (remaining > 0) throw new BadRequestException(`Insufficient stock for SKU ${item.skuId}`);

        await tx.inTransitInventory.update({
          where: { id: item.id },
          data: { status: 'in_transit' },
        });
      }

      // 更新发货单
      await tx.shipment.update({
        where: { id },
        data: { status: 'shipped', carrier: dto.carrier || shipment.carrier, trackingNo: dto.trackingNo || shipment.trackingNo, shippedAt: new Date() },
      });

      // 更新订单状态
      const shipments = await tx.shipment.findMany({ where: { orderId: shipment.orderId } });
      const allShipped = shipments.every(s => ['shipped', 'partially_received', 'received'].includes(s.status));
      const newOrderStatus = allShipped ? 'shipped' : 'partially_shipped';

      await tx.order.update({
        where: { id: shipment.orderId },
        data: { orderStatus: newOrderStatus, shippedAt: allShipped ? new Date() : null },
      });

      await tx.orderStatusLog.create({
        data: { brandId: shipment.brandId, orderId: shipment.orderId, fromStatus: shipment.order.orderStatus, toStatus: newOrderStatus, operatorId, remark: `Shipment ${shipment.shipmentNo}` },
      });

      return { success: true, orderStatus: newOrderStatus };
    });
  }

  /** 加盟店签收 */
  async receive(id: string, dto: ReceiveDto, storeId: string) {
    return this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.findUnique({
        where: { id },
        include: { inTransits: true },
      });
      if (!shipment) throw new NotFoundException('Shipment not found');
      if (shipment.toStoreId !== storeId) throw new BadRequestException('Not your shipment');
      if (!['shipped', 'partially_received'].includes(shipment.status)) {
        throw new BadRequestException(`Cannot receive shipment in status: ${shipment.status}`);
      }

      for (const item of dto.items) {
        await tx.inTransitInventory.updateMany({
          where: { shipmentId: id, skuId: item.skuId, status: 'in_transit' },
          data: { status: 'received', receivedAt: new Date() },
        });
      }

      // 检查签收完成度
      const remaining = await tx.inTransitInventory.count({
        where: { shipmentId: id, status: 'in_transit' },
      });
      const newStatus = remaining === 0 ? 'received' : 'partially_received';
      await tx.shipment.update({ where: { id }, data: { status: newStatus, receivedAt: remaining === 0 ? new Date() : null } });

      // 订单状态联动
      const order = await tx.order.findUnique({ where: { id: shipment.orderId }, include: { shipments: true } });
      const allReceived = order!.shipments.every(s => s.status === 'received');
      if (allReceived) {
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { orderStatus: 'received', receivedAt: new Date() },
        });
        await tx.orderStatusLog.create({
          data: { brandId: shipment.brandId, orderId: shipment.orderId, fromStatus: order!.orderStatus, toStatus: 'received', operatorId: storeId, remark: 'All shipments received' },
        });
      }

      return { success: true, shipmentStatus: newStatus };
    });
  }

  /** 取消发货单 */
  async cancelShipment(id: string, operatorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.findUnique({ where: { id, status: 'pending' } });
      if (!shipment) throw new NotFoundException('Shipment not found or not cancellable');

      await tx.shipment.update({ where: { id }, data: { status: 'cancelled' } });
      await tx.inTransitInventory.deleteMany({ where: { shipmentId: id } });
      return { success: true };
    });
  }
}
```

- [ ] **Step 2: 编译验证**

```bash
cd D:/hxfood/apps/server && npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add apps/server/src/modules/shipment/shipment.service.ts
git commit -m "feat: add ShipmentService with full lifecycle"
```

---

### Task 4: Shipment Controller + Module

**Files:**
- Create: `apps/server/src/modules/shipment/shipment.controller.ts`
- Create: `apps/server/src/modules/shipment/shipment.module.ts`
- Modify: `apps/server/src/app.module.ts`

- [ ] **Step 1: 创建 shipment.controller.ts**

```typescript
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ShipmentService } from './shipment.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { ShipDto } from './dto/ship.dto';
import { ReceiveDto } from './dto/receive.dto';
import { RequirePermission } from '../../common/decorators/require-permission';
import { BrandContext } from '../../common/decorators/brand-context';
import { CurrentUser } from '../../common/decorators/current-user';
import { JwtPayload } from '@hxfood/shared-types';

@Controller('shipment')
export class ShipmentController {
  constructor(private shipmentService: ShipmentService) {}

  @Post()
  @RequirePermission('inventory:manage')
  async createShipment(@Body() dto: CreateShipmentDto, @BrandContext() ctx: any, @CurrentUser() user: JwtPayload) {
    return this.shipmentService.createShipment(dto, ctx.brandId, user.sub);
  }

  @Get()
  @RequirePermission('inventory:view')
  async listShipments(@BrandContext() ctx: any, @Query('orderId') orderId?: string, @Query('status') status?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.shipmentService.listShipments(ctx.brandId, { orderId, status, page: page ? parseInt(page) : undefined, pageSize: pageSize ? parseInt(pageSize) : undefined });
  }

  @Get(':id')
  @RequirePermission('inventory:view')
  async getShipment(@Param('id') id: string) {
    return this.shipmentService.getShipment(id);
  }

  @Post(':id/ship')
  @RequirePermission('inventory:manage')
  async ship(@Param('id') id: string, @Body() dto: ShipDto, @CurrentUser() user: JwtPayload) {
    return this.shipmentService.ship(id, dto, user.sub);
  }

  @Post(':id/receive')
  @RequirePermission('product:view')
  async receive(@Param('id') id: string, @Body() dto: ReceiveDto, @BrandContext() ctx: any) {
    return this.shipmentService.receive(id, dto, ctx.orgId);
  }

  @Post(':id/cancel')
  @RequirePermission('inventory:manage')
  async cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.shipmentService.cancelShipment(id, user.sub);
  }
}
```

- [ ] **Step 2: 创建 shipment.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ShipmentController } from './shipment.controller';
import { ShipmentService } from './shipment.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShipmentController],
  providers: [ShipmentService],
})
export class ShipmentModule {}
```

- [ ] **Step 3: 注册到 AppModule**

在 `apps/server/src/app.module.ts` 中：
1. 添加 `import { ShipmentModule } from './modules/shipment/shipment.module';`
2. 在 imports 数组中添加 `ShipmentModule`

- [ ] **Step 4: 编译 + 提交**

```bash
cd D:/hxfood/apps/server && npx tsc --noEmit
git add apps/server/src/modules/shipment/ apps/server/src/app.module.ts
git commit -m "feat: add ShipmentController and module registration"
```

---

### Task 5: Production 模块增强

**Files:**
- Modify: `apps/server/src/modules/production/production.service.ts`
- Modify: `apps/server/src/modules/production/production.controller.ts`

- [ ] **Step 1: 在 production.service.ts 添加 listOrders 和 startProduction**

在原 `createProductionOrder` 方法之后添加：

```typescript
  /** 生产工单列表 */
  async listProductionOrders(brandId: string, params: { status?: string; page?: number; pageSize?: number }) {
    const where: any = { brandId, orderStatus: { in: ['pending_production', 'in_production', 'partially_produced', 'produced'] } };
    if (params.status) where.orderStatus = params.status;
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { store: { select: { name: true } }, orderItems: { include: { sku: { select: { skuCode: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** 开始生产 */
  async startProduction(orderId: string, brandId: string, operatorId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');
    if (!['pending_production'].includes(order.orderStatus)) throw new Error('Invalid status');

    await this.prisma.order.update({
      where: { id: orderId },
      data: { orderStatus: 'in_production', orderStatusLogs: { create: { brandId, fromStatus: order.orderStatus, toStatus: 'in_production', operatorId, remark: '开始生产' } } },
    });
    return { success: true, status: 'in_production' };
  }
```

- [ ] **Step 2: 在 production.controller.ts 添加对应端点**

```typescript
  @Get('orders')
  @RequirePermission('production:view')
  async listOrders(@BrandContext() ctx: any, @Query('status') status?: string, @Query('page') page?: string) {
    return this.productionService.listProductionOrders(ctx.brandId, { status, page: page ? parseInt(page) : undefined });
  }

  @Post('orders/:orderId/start')
  @RequirePermission('production:manage')
  async startProduction(@Param('orderId') orderId: string, @BrandContext() ctx: any, @CurrentUser() user: JwtPayload) {
    return this.productionService.startProduction(orderId, ctx.brandId, user.sub);
  }
```

需要添加 `CurrentUser`, `JwtPayload`, `Param`, `Get` 的 import（按现有 controller pattern）。

- [ ] **Step 3: 编译 + 提交**

```bash
cd D:/hxfood/apps/server && npx tsc --noEmit
git add apps/server/src/modules/production/
git commit -m "feat: add production order list and start production endpoints"
```

---

### Task 6: Order 库存锁/解锁触发器集成

**Files:**
- Modify: `apps/server/src/modules/order/order.service.ts`

- [ ] **Step 1: 在 order.service.ts 的 transition 方法中集成库存操作**

在状态变更成功后添加触发器——当 `approved` 时 lockStock，`cancelled` 时 unlockStock。修改 `transition` 方法（事务成功后）：

```typescript
// transition 方法 return 前增加:
// 注意：需在 orderService 中注入 InventoryService

import { InventoryService } from '../inventory/inventory.service';
// constructor 添加: private inventoryService: InventoryService

// 在事务成功后:
if (newStatus === 'approved') {
  // 异步锁库存（非阻塞）
  this.inventoryService.lockStockForOrder(order.id, brandId).catch(e => 
    this.logger.error(`Lock stock failed for order ${order.orderNo}: ${e.message}`)
  );
}
if (newStatus === 'cancelled') {
  this.inventoryService.unlockStock(order.orderNo, brandId).catch(e =>
    this.logger.error(`Unlock stock failed for order ${order.orderNo}: ${e.message}`)
  );
}
```

### 简化实现：在 inventory.service.ts 中添加便于调用的封装方法

```typescript
// inventory.service.ts 新增:
async lockStockForOrder(orderId: string, brandId: string) {
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: { orderItems: true },
  });
  if (!order) throw new Error('Order not found');

  // 找到成品仓库
  const warehouse = await this.prisma.warehouse.findFirst({
    where: { brandId, warehouseType: 'finished' },
  });
  if (!warehouse) return; // 无仓库则跳过

  for (const item of order.orderItems) {
    await this.lockStock(item.skuId, warehouse.id, brandId, Number(item.quantity), order.orderNo);
  }
}
```

- [ ] **Step 2: 编译 + 提交**

```bash
cd D:/hxfood/apps/server && npx tsc --noEmit
git add apps/server/src/modules/order/ apps/server/src/modules/inventory/
git commit -m "feat: integrate inventory lock/unlock into order state transitions"
```

---

### Task 7: Miniapp — 收货确认 + 订单详情增强

**Files:**
- Create: `apps/miniapp/subpkg-franchisee/order/receive.vue`
- Modify: `apps/miniapp/subpkg-franchisee/order/detail.vue`

- [ ] **Step 1: 创建 receive.vue（签收确认页）**

```vue
<template>
  <view class="page">
    <view class="shipment-info">
      <text class="label">发货单号</text>
      <text class="value">{{ shipment.shipmentNo }}</text>
    </view>

    <view class="section-title">收货明细</view>
    <view class="item" v-for="item in shipment.inTransits" :key="item.id">
      <text class="item-name">{{ item.sku?.spu?.name || item.skuId }}</text>
      <text class="item-spec">{{ item.sku?.skuCode }}</text>
      <view class="qty-row">
        <text class="sent-qty">发货: {{ item.quantity }}</text>
        <input v-model="receiveQtys[item.skuId]" type="number" class="qty-input" placeholder="实收数量" />
      </view>
    </view>

    <button class="btn" :loading="submitting" @tap="handleReceive">确认收货</button>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { api } from '@/subpkg-common/api/request';

const pages = getCurrentPages();
const page = pages[pages.length - 1];
const shipmentId = (page as any).options?.shipmentId || '';
const shipment = ref<any>({ inTransits: [] });
const receiveQtys = reactive<Record<string, number>>({});
const submitting = ref(false);

onMounted(async () => {
  try {
    const res = await api.get(`/shipment/${shipmentId}`);
    shipment.value = res;
    (res.inTransits || []).forEach((it: any) => { receiveQtys[it.skuId] = it.quantity; });
  } catch (e: any) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' });
  }
});

async function handleReceive() {
  const items = Object.entries(receiveQtys).map(([skuId, qty]) => ({ skuId, qty: Number(qty) }));
  if (items.some(i => i.qty <= 0)) { uni.showToast({ title: '请输入有效数量', icon: 'none' }); return; }
  submitting.value = true;
  try {
    await api.post(`/shipment/${shipmentId}/receive`, { items });
    uni.showToast({ title: '签收成功', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 1000);
  } catch (e: any) {
    uni.showToast({ title: e.message || '签收失败', icon: 'none' });
  } finally { submitting.value = false; }
}
</script>

<style lang="scss" scoped>
.page { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.shipment-info { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
.label { font-size: 24rpx; color: #999; display: block; }
.value { font-size: 28rpx; font-weight: 500; margin-top: 4rpx; display: block; }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 16rpx; }
.item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 16rpx; }
.item-name { font-size: 28rpx; font-weight: 500; display: block; }
.item-spec { font-size: 24rpx; color: #999; display: block; margin: 4rpx 0; }
.qty-row { display: flex; align-items: center; margin-top: 12rpx; }
.sent-qty { font-size: 26rpx; color: #666; margin-right: 20rpx; }
.qty-input { flex: 1; background: #f8f8f8; border-radius: 8rpx; padding: 10rpx 16rpx; font-size: 26rpx; }
.btn { margin-top: 40rpx; width: 100%; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border-radius: 44rpx; font-size: 32rpx; font-weight: 600; height: 88rpx; line-height: 88rpx; }
</style>
```

- [ ] **Step 2: 在 order/detail.vue 底栏增加收货入口**

在 order/detail.vue 的底栏操作区添加（shipped/partially_shipped 状态下显示）：

```vue
<!-- 在操作按钮区域添加： -->
<button v-if="order.orderStatus === 'shipped' || order.orderStatus === 'partially_shipped'"
  class="btn-receive" @tap="goReceiveShipment(shipmentId)">
  确认收货
</button>
```

并在 script 中添加 `goReceiveShipment` 方法和 shipment 数据获取。

- [ ] **Step 3: 提交**

```bash
git add apps/miniapp/subpkg-franchisee/order/
git commit -m "feat: add miniapp receive page and order detail receive button"
```

---

### Task 8: Admin-HQ — Shipments + Production 页面

**Files:**
- Create: `apps/admin-hq/src/views/Shipments.vue`
- Create: `apps/admin-hq/src/views/Production.vue`

- [ ] **Step 1: 创建 Shipments.vue**（发货单管理页：列表/创建/发货/取消）

- [ ] **Step 2: 创建 Production.vue**（生产工单：列表/开始生产/生产完成）

页面需遵循 admin-hq 现有 Options API 模式（ref/onMounted + api 模块）。

- [ ] **Step 3: 提交**

```bash
git add apps/admin-hq/src/views/Shipments.vue apps/admin-hq/src/views/Production.vue
git commit -m "feat: add admin Shipments and Production management pages"
```

---

### Task 9: Admin-HQ — Orders 页面增强

**Files:**
- Modify: `apps/admin-hq/src/views/Orders.vue`

在订单列表/详情中增加生产状态列和发货单入口链接。

- [ ] **Step 1: 编译验证 + 提交**

```bash
git add apps/admin-hq/src/views/Orders.vue
git commit -m "feat: add production/shipment info to admin Orders page"
```

---

### Task 10: 构建验证

- [ ] **Step 1: 后端编译**

```bash
cd D:/hxfood/apps/server && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 2: Prisma generate**

```bash
cd D:/hxfood/apps/server && npx prisma generate
```
Expected: Client generated successfully.

- [ ] **Step 3: 最终提交**

```bash
git add .
git commit -m "chore: Phase 4 final build verification passed"
```

---

## 验收清单

| # | 条件 | 验证方式 |
|---|------|---------|
| 1 | CK可查看待生产订单列表 | GET /production/orders |
| 2 | CK可开始/完成生产入库 | POST production start/complete |
| 3 | 创建发货单选择订单和商品 | POST /shipment |
| 4 | 发货实扣FIFO库存 | POST /shipment/:id/ship |
| 5 | 加盟店签收 + 在途→已签收 | POST /shipment/:id/receive |
| 6 | 全部签收→订单received | 自动联动验证 |
| 7 | 分批发货 partially_shipped → received | 多shipment场景 |
| 8 | tsc --noEmit 通过 | 无编译错误 |
