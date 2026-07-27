import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /** GET /analytics/summary — total orders, total amount (yuan), avg per store (this month) */
  async getSummary(brandId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total orders this month
    const totalOrders = await this.prisma.order.count({
      where: {
        brandId,
        createdAt: { gte: startOfMonth },
      },
    });

    // Total amount this month (sum of totalAmount, which is in fen)
    const amountResult = await this.prisma.order.aggregate({
      where: {
        brandId,
        createdAt: { gte: startOfMonth },
      },
      _sum: { totalAmount: true },
    });
    const totalAmountFen = amountResult._sum.totalAmount || 0;
    const totalAmountYuan = (totalAmountFen / 100).toFixed(2);

    // Active stores (stores that placed at least one order this month)
    const storeResult = await this.prisma.order.groupBy({
      by: ['storeId'],
      where: {
        brandId,
        createdAt: { gte: startOfMonth },
      },
    });
    const activeStores = storeResult.length;

    // Avg per store
    const avgPerStore = activeStores > 0
      ? ((totalAmountFen / 100) / activeStores).toFixed(2)
      : '0.00';

    return {
      totalOrders,
      totalAmountYuan,
      activeStores,
      avgPerStore,
    };
  }

  /** GET /analytics/order-trend — last 30 days: [{date, count, amount}] */
  async getOrderTrend(brandId: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const orders = await this.prisma.order.findMany({
      where: {
        brandId,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Aggregate by date
    const dateMap = new Map<string, { count: number; amount: number }>();

    // Initialize all 30 days
    for (let i = 0; i < 30; i++) {
      const d = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().substring(0, 10);
      dateMap.set(dateStr, { count: 0, amount: 0 });
    }

    for (const order of orders) {
      const dateStr = order.createdAt.toISOString().substring(0, 10);
      const entry = dateMap.get(dateStr);
      if (entry) {
        entry.count += 1;
        entry.amount += order.totalAmount;
      }
    }

    const trend = Array.from(dateMap.entries()).map(([date, val]) => ({
      date,
      count: val.count,
      amount: (val.amount / 100).toFixed(2),
    }));

    return trend;
  }

  /** GET /analytics/hot-skus — top 10 SKUs by total quantity sold */
  async getHotSkus(brandId: string) {
    const items = await this.prisma.orderItem.groupBy({
      by: ['skuId', 'skuName'],
      where: {
        brandId,
      },
      _sum: {
        quantity: true,
        amount: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 10,
    });

    return items.map((item) => ({
      skuId: item.skuId,
      name: item.skuName,
      count: Number(item._sum.quantity || 0),
      amount: ((item._sum.amount || 0) / 100).toFixed(2),
    }));
  }

  /** GET /analytics/store-ranking — top stores by order amount */
  async getStoreRanking(brandId: string) {
    const orders = await this.prisma.order.groupBy({
      by: ['storeId'],
      where: {
        brandId,
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          totalAmount: 'desc',
        },
      },
      take: 20,
    });

    // Get store names
    const storeIds = orders.map((o) => o.storeId);
    const stores = await this.prisma.organization.findMany({
      where: { id: { in: storeIds } },
      select: { id: true, name: true },
    });
    const storeNameMap = new Map(stores.map((s) => [s.id, s.name]));

    return orders.map((o) => ({
      storeId: o.storeId,
      name: storeNameMap.get(o.storeId) || o.storeId,
      orderCount: o._count.id,
      amount: ((o._sum.totalAmount || 0) / 100).toFixed(2),
    }));
  }
}
