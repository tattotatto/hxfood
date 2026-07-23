import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ProductionService {
  constructor(private prisma: PrismaService) {}

  /** 创建生产工单（关联订单） */
  async createProductionOrder(brandId: string, dto: {
    orderId: string; warehouseId: string; notes?: string;
  }) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new Error('Order not found');

    await this.prisma.order.update({
      where: { id: dto.orderId },
      data: { orderStatus: 'pending_production', orderStatusLogs: { create: {
        brandId, fromStatus: order.orderStatus, toStatus: 'pending_production',
        operatorId: '', remark: '创建生产工单',
      }}},
    });

    return { success: true, orderId: dto.orderId, status: 'pending_production' };
  }

  /** 生产完成入库 */
  async completeProduction(brandId: string, dto: {
    orderId: string; warehouseId: string; items: { skuId: string; lotNo: string; quantity: number }[];
  }) {
    // 入库
    for (const item of dto.items) {
      const existing = await this.prisma.inventory.findUnique({
        where: { warehouseId_skuId_lotNo: { warehouseId: dto.warehouseId, skuId: item.skuId, lotNo: item.lotNo } },
      });
      if (existing) {
        await this.prisma.inventory.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.quantity, updatedAt: new Date() },
        });
      } else {
        await this.prisma.inventory.create({
          data: { brandId, warehouseId: dto.warehouseId, skuId: item.skuId, lotNo: item.lotNo, quantity: item.quantity, lockedQty: 0, status: 'normal' },
        });
      }
      await this.prisma.inventoryTransaction.create({
        data: { brandId, warehouseId: dto.warehouseId, skuId: item.skuId, lotNo: item.lotNo,
          transType: 'production_in', quantity: item.quantity, balanceAfter: (existing?.quantity ?? 0) + item.quantity,
          bizType: 'production', bizNo: dto.orderId },
      });
    }

    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    await this.prisma.order.update({
      where: { id: dto.orderId },
      data: { orderStatus: 'produced', producedAt: new Date(), orderStatusLogs: { create: {
        brandId, fromStatus: order!.orderStatus, toStatus: 'produced', operatorId: '', remark: '生产完成',
      }}},
    });

    return { success: true };
  }
}
