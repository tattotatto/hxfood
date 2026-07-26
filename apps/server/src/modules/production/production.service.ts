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
