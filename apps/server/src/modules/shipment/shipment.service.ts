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
      where: { brandId, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
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
