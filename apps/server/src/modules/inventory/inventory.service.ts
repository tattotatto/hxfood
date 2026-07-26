import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // ── 仓库 ──
  async getWarehouses(brandId: string) {
    return this.prisma.warehouse.findMany({ where: { brandId } });
  }

  async createWarehouse(brandId: string, dto: { name: string; orgId: string; warehouseType: string; address?: any }) {
    return this.prisma.warehouse.create({
      data: { brandId, ...dto, warehouseType: dto.warehouseType as any },
    });
  }

  // ── 库存查询 ──
  async getInventory(brandId: string, skuId?: string, warehouseId?: string) {
    const where: any = { brandId, status: 'normal' };
    if (skuId) where.skuId = skuId;
    if (warehouseId) where.warehouseId = warehouseId;

    const items = await this.prisma.inventory.findMany({
      where,
      include: { sku: { include: { spu: true } }, warehouse: true },
      orderBy: { expiryAt: 'asc' },
    });

    return items.map(i => ({
      id: i.id,
      skuId: i.skuId,
      skuCode: i.sku.skuCode,
      skuName: i.sku.spu.name,
      lotNo: i.lotNo,
      quantity: i.quantity,
      lockedQty: i.lockedQty,
      availableQty: i.quantity - i.lockedQty,
      warehouse: i.warehouse.name,
      producedAt: i.producedAt?.toISOString() || null,
      expiryAt: i.expiryAt?.toISOString() || null,
      status: i.status,
    }));
  }

  // ── 锁定库存（订单审核通过时调用） ──
  async lockStock(skuId: string, warehouseId: string, brandId: string, qty: number, orderNo: string) {
    return this.prisma.$transaction(async (tx) => {
      // FIFO: 按效期升序取库存
      const batches = await tx.inventory.findMany({
        where: { skuId, warehouseId, brandId, status: 'normal' },
        orderBy: [{ expiryAt: 'asc' }, { producedAt: 'asc' }],
      });

      let remaining = qty;
      const locks: any[] = [];

      for (const batch of batches) {
        if (remaining <= 0) break;
        const available = batch.quantity - batch.lockedQty;
        const lockQty = Math.min(available, remaining);
        if (lockQty <= 0) continue;

        await tx.inventory.update({
          where: { id: batch.id },
          data: { lockedQty: batch.lockedQty + lockQty, updatedAt: new Date() },
        });

        await tx.inventoryTransaction.create({
          data: {
            brandId, warehouseId: batch.warehouseId, skuId,
            lotNo: batch.lotNo, transType: 'lock', quantity: -lockQty,
            balanceAfter: batch.quantity - batch.lockedQty - lockQty,
            bizType: 'order', bizNo: orderNo,
          },
        });

        locks.push({ lotNo: batch.lotNo, qty: lockQty });
        remaining -= lockQty;
      }

      if (remaining > 0) throw new BadRequestException(`Insufficient stock: need ${qty}, short ${remaining}`);
      return { success: true, locks };
    });
  }

  // ── 锁定订单全部商品库存 ──
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

  // ── 释放预占（订单取消时调用） ──
  async unlockStock(orderNo: string, brandId: string) {
    const txs = await this.prisma.inventoryTransaction.findMany({
      where: { bizNo: orderNo, transType: 'lock', brandId },
    });

    for (const t of txs) {
      await this.prisma.inventory.updateMany({
        where: { warehouseId: t.warehouseId, skuId: t.skuId, lotNo: t.lotNo, brandId },
        data: { lockedQty: { decrement: Math.abs(t.quantity) }, updatedAt: new Date() },
      });
      await this.prisma.inventoryTransaction.create({
        data: {
          brandId, warehouseId: t.warehouseId, skuId: t.skuId,
          lotNo: t.lotNo, transType: 'unlock', quantity: Math.abs(t.quantity),
          balanceAfter: 0, bizType: 'order', bizNo: orderNo,
        },
      });
    }
    return { success: true };
  }

  // ── 实扣库存（发货时调用） ──
  async deductStock(skuId: string, warehouseId: string, brandId: string, qty: number, orderNo: string, lotNo?: string) {
    return this.prisma.$transaction(async (tx) => {
      const where: any = { skuId, warehouseId, brandId, status: 'normal' };
      if (lotNo) where.lotNo = lotNo;

      const batch = await tx.inventory.findFirst({
        where,
        orderBy: { expiryAt: 'asc' },
      });
      if (!batch) throw new BadRequestException('No stock available');
      if (batch.quantity < qty) throw new BadRequestException(`Insufficient stock: ${batch.quantity} < ${qty}`);

      await tx.inventory.update({
        where: { id: batch.id },
        data: {
          quantity: batch.quantity - qty,
          lockedQty: Math.max(0, batch.lockedQty - qty),
          updatedAt: new Date(),
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          brandId, warehouseId, skuId, lotNo: batch.lotNo,
          transType: 'sale_out', quantity: -qty,
          balanceAfter: batch.quantity - qty,
          bizType: 'order', bizNo: orderNo,
        },
      });

      return { success: true, lotNo: batch.lotNo };
    });
  }

  // ── 入库 ──
  async inbound(dto: {
    skuId: string; warehouseId: string; brandId: string; lotNo: string;
    quantity: number; producedAt?: string; expiryAt?: string; bizType?: string; bizNo?: string;
  }) {
    const existing = await this.prisma.inventory.findUnique({
      where: { warehouseId_skuId_lotNo: { warehouseId: dto.warehouseId, skuId: dto.skuId, lotNo: dto.lotNo } },
    });

    if (existing) {
      const updated = await this.prisma.inventory.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + dto.quantity, updatedAt: new Date() },
      });
      await this.recordTransaction(dto, updated.quantity, 'purchase_in');
      return updated;
    }

    const created = await this.prisma.inventory.create({
      data: {
        brandId: dto.brandId, warehouseId: dto.warehouseId, skuId: dto.skuId,
        lotNo: dto.lotNo, quantity: dto.quantity, lockedQty: 0,
        producedAt: dto.producedAt ? new Date(dto.producedAt) : null,
        expiryAt: dto.expiryAt ? new Date(dto.expiryAt) : null,
        status: 'normal',
      },
    });
    await this.recordTransaction(dto, dto.quantity, dto.bizType as any || 'purchase_in');
    return created;
  }

  private async recordTransaction(dto: any, balanceAfter: number, transType: string) {
    await this.prisma.inventoryTransaction.create({
      data: {
        brandId: dto.brandId, warehouseId: dto.warehouseId, skuId: dto.skuId,
        lotNo: dto.lotNo, transType: transType as any, quantity: dto.quantity,
        balanceAfter, bizType: dto.bizType || 'purchase', bizNo: dto.bizNo || '',
      },
    });
  }

  // ── 流水查询 ──
  async getTransactions(brandId: string, skuId?: string, page = 1, pageSize = 50) {
    const where: any = { brandId };
    if (skuId) where.skuId = skuId;
    const [items, total] = await Promise.all([
      this.prisma.inventoryTransaction.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page-1)*pageSize, take: pageSize,
      }),
      this.prisma.inventoryTransaction.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}
