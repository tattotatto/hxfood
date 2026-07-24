import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProductService } from '../product/product.service';
import { ClsService } from 'nestjs-cls';
import * as utils from '@hxfood/shared-utils';
import { canTransition, isTerminal, OrderStatus } from './order.state-machine';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private productService: ProductService,
    private cls: ClsService,
  ) {}

  async createOrder(
    dto: CreateOrderDto,
    brandId: string,
    storeId: string,
    userId: string,
  ) {
    if (!utils.isValidIdempotencyKey(dto.idempotencyKey))
      throw new BadRequestException('Invalid idempotency key');

    if (!dto.items || dto.items.length === 0)
      throw new BadRequestException('Order must have at least one item');

    // 幂等检查：同一幂等键直接返回已有订单
    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
      include: { orderItems: true, orderStatusLogs: { orderBy: { createdAt: 'asc' } } },
    });
    if (existing) {
      return this.formatOrder(existing);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await this.prisma.order.count({
      where: { brandId, createdAt: { gte: today } },
    });
    const orderNo = utils.generateOrderNo(new Date(), todayCount + 1);

    return this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItems: any[] = [];

      for (const item of dto.items) {
        const skuData = await this.productService.getSkuById(brandId, item.skuId, storeId);

        if (skuData.stockAvailable < item.quantity) {
          throw new BadRequestException(
            `SKU ${(skuData as any).skuCode || item.skuId}: insufficient stock`,
          );
        }

        if (item.quantity < skuData.minOrderQty) {
          throw new BadRequestException(
            `SKU ${(skuData as any).skuCode || item.skuId}: min order qty is ${skuData.minOrderQty}`,
          );
        }

        const unitPriceFen = (skuData as any).effectivePrice || (skuData as any).price * 100;
        const amount = utils.multiplyPrice(unitPriceFen, item.quantity);
        totalAmount += amount;

        orderItems.push({
          skuId: item.skuId,
          skuCode: (skuData as any).skuCode || item.skuId,
          skuName: (skuData as any).name || (skuData as any).skuCode || item.skuId,
          unitPrice: unitPriceFen,
          quantity: item.quantity,
          amount,
          brandId,
        });
      }

      const order = await tx.order.create({
        data: {
          brandId,
          orderNo,
          storeId,
          orderType: 'sale',
          orderStatus: 'draft',
          totalAmount,
          paymentMethod: dto.paymentMethod as any,
          shippingAddress: dto.shippingAddress ?? {},
          expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : null,
          notes: dto.notes,
          createdBy: userId,
          idempotencyKey: dto.idempotencyKey,
          submittedAt: new Date(),
          orderItems: { create: orderItems },
          orderStatusLogs: {
            create: {
              brandId,
              fromStatus: undefined as any,
              toStatus: 'draft',
              operatorId: userId,
              remark: '订单创建',
            },
          },
        },
        include: { orderItems: true },
      });

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
    });
  }

  async transition(
    orderId: string,
    toStatus: OrderStatus,
    operatorId: string,
    role: string,
    remark?: string,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (isTerminal(order.orderStatus))
      throw new BadRequestException('Order is already in terminal state');

    canTransition(order.orderStatus, toStatus, role);

    const timestampFields: any = {};
    if (toStatus === 'approved') timestampFields.approvedAt = new Date();
    if (toStatus === 'produced') timestampFields.producedAt = new Date();
    if (toStatus === 'shipped') timestampFields.shippedAt = new Date();
    if (toStatus === 'received') timestampFields.receivedAt = new Date();
    if (toStatus === 'cancelled') timestampFields.cancelledAt = new Date();

    // 审核记录：审核/驳回/取消操作写入 order_approvals
    if (['approved', 'rejected'].includes(toStatus)) {
      await this.prisma.orderApproval.create({
        data: {
          brandId: order.brandId,
          orderId: order.id,
          approverId: operatorId,
          approvalType: (toStatus === 'approved' ? 'review' : 'reject') as any,
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
          approvalType: 'cancel' as any,
          comment: remark || null,
        },
      });
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        orderStatus: toStatus,
        ...timestampFields,
        orderStatusLogs: {
          create: {
            brandId: order.brandId,
            fromStatus: order.orderStatus,
            toStatus,
            operatorId,
            remark: remark || '',
          },
        },
      },
      include: { orderItems: true, orderStatusLogs: { orderBy: { createdAt: 'asc' } } },
    });

    return this.formatOrder(updated);
  }

  async findOrders(brandId: string, storeId?: string, status?: string, page = 1, pageSize = 20) {
    const where: any = { brandId };
    if (storeId) where.storeId = storeId;
    if (status) where.orderStatus = status;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { orderItems: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: orders.map(o => ({
        id: o.id,
        orderNo: o.orderNo,
        orderStatus: o.orderStatus,
        totalAmount: utils.fenToYuan(o.totalAmount),
        paymentMethod: o.paymentMethod,
        itemCount: o.orderItems.length,
        createdAt: o.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  async getOrderDetail(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        orderStatusLogs: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.formatOrder(order);
  }

  private formatOrder(order: any) {
    return {
      id: order.id,
      orderNo: order.orderNo,
      orderStatus: order.orderStatus,
      orderType: order.orderType,
      totalAmount: utils.fenToYuan(order.totalAmount),
      paymentMethod: order.paymentMethod,
      items: order.orderItems.map((i: any) => ({
        id: i.id,
        skuCode: i.skuCode,
        skuName: i.skuName,
        unitPrice: utils.fenToYuan(i.unitPrice),
        quantity: Number(i.quantity),
        shippedQty: Number(i.shippedQty),
        receivedQty: Number(i.receivedQty),
        amount: utils.fenToYuan(i.amount),
        status: i.status,
        lotNo: i.lotNo,
      })),
      timeline: order.orderStatusLogs.map((l: any) => ({
        time: l.createdAt.toISOString(),
        status: l.toStatus,
        operator: l.operatorId,
        remark: l.remark,
      })),
      createdAt: order.createdAt.toISOString(),
    };
  }
}
