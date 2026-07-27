import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as utils from '@hxfood/shared-utils';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  /** 获取加盟店账户 */
  async getAccount(storeId: string) {
    const account = await this.prisma.storeAccount.findUnique({
      where: { storeId },
      include: { store: true },
    });
    if (!account) return null;
    return {
      storeId: account.storeId,
      storeName: account.store.name,
      balance: utils.fenToYuan(account.balance),
      creditLimit: utils.fenToYuan(account.creditLimit),
      frozenAmount: utils.fenToYuan(account.frozenAmount),
      availableBalance: utils.fenToYuan(account.balance - account.frozenAmount),
      status: account.status,
    };
  }

  /** 账户流水 */
  async getTransactions(storeId: string, page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      this.prisma.accountTransaction.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.accountTransaction.count({ where: { storeId } }),
    ]);

    return {
      items: items.map(t => ({
        id: t.id,
        transType: t.transType,
        amount: utils.fenToYuan(t.amount),
        balanceAfter: utils.fenToYuan(t.balanceAfter),
        bizNo: t.bizNo,
        remark: t.remark,
        createdAt: t.createdAt.toISOString(),
      })),
      total, page, pageSize,
    };
  }

  /** 应收账款列表 */
  async getReceivables(brandId: string, storeId?: string, status?: string) {
    const where: any = { brandId };
    if (storeId) where.storeId = storeId;
    if (status) where.status = status;

    return this.prisma.receivable.findMany({
      where,
      include: { order: true },
      orderBy: { dueDate: 'asc' },
    });
  }

  /** 生成月度对账 */
  async generateReconciliation(brandId: string, period: string) {
    const results: any[] = [];
    const stores = await this.prisma.organization.findMany({
      where: { brandId, orgType: 'franchise_store', status: 'active' },
    });

    for (const store of stores) {
      // 幂等：该周期已存在记录则跳过
      const existing = await this.prisma.monthlyReconciliation.findUnique({
        where: { storeId_period: { storeId: store.id, period } },
      });
      if (existing) continue;

      // 计算期初余额（取上一期期末余额，无则 0）
      const [prevYear, prevMonthNum] = period.split('-').map(Number);
      const prevDate = new Date(prevYear, prevMonthNum - 2); // JS months 0-indexed
      const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
      const prevRec = await this.prisma.monthlyReconciliation.findFirst({
        where: { storeId: store.id, period: prevPeriod },
        orderBy: { period: 'desc' },
      });
      const openingBalance = prevRec?.closingBalance ?? 0;

      // 计算当期：period 格式 "2026-07"
      const periodStart = new Date(`${period}-01T00:00:00.000Z`);
      const periodEnd = new Date(periodStart);
      periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

      const txFilter = {
        storeId: store.id,
        createdAt: { gte: periodStart, lt: periodEnd },
      };

      const txs = await this.prisma.accountTransaction.findMany({ where: txFilter });
      const totalRecharge = txs.filter(t => t.transType === 'recharge').reduce((s, t) => s + t.amount, 0);
      const totalSpent = txs.filter(t => t.transType === 'order_pay').reduce((s, t) => s + Math.abs(t.amount), 0);
      const totalRefund = txs.filter(t => t.transType === 'refund').reduce((s, t) => s + t.amount, 0);

      const account = await this.prisma.storeAccount.findUnique({ where: { storeId: store.id } });
      const closingBalance = account?.balance ?? 0;
      const expectedClose = openingBalance + totalRecharge - totalSpent + totalRefund;
      const hasDifference = expectedClose !== closingBalance;

      await this.prisma.monthlyReconciliation.create({
        data: {
          brandId,
          storeId: store.id,
          period,
          openingBalance,
          totalRecharge,
          totalSpent,
          totalRefund,
          closingBalance,
          expectedClose,
          hasDifference,
          status: 'pending',
        },
      });
      results.push({ storeId: store.id, storeName: store.name, hasDifference });
    }
    return { generated: results.length, results };
  }

  /** 对账列表 */
  async listReconciliations(brandId: string, params: { storeId?: string; period?: string; status?: string; page?: number; pageSize?: number }) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const where: any = { brandId };
    if (params.storeId) where.storeId = params.storeId;
    if (params.period) where.period = params.period;
    if (params.status) where.status = params.status;

    const [items, total] = await Promise.all([
      this.prisma.monthlyReconciliation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { store: { select: { name: true } } },
      }),
      this.prisma.monthlyReconciliation.count({ where }),
    ]);

    return {
      items: items.map(r => ({
        id: r.id,
        storeId: r.storeId,
        storeName: r.store.name,
        period: r.period,
        openingBalance: utils.fenToYuan(r.openingBalance),
        totalRecharge: utils.fenToYuan(r.totalRecharge),
        totalSpent: utils.fenToYuan(r.totalSpent),
        totalRefund: utils.fenToYuan(r.totalRefund),
        closingBalance: utils.fenToYuan(r.closingBalance),
        expectedClose: utils.fenToYuan(r.expectedClose),
        difference: utils.fenToYuan(r.expectedClose - r.closingBalance),
        hasDifference: r.hasDifference,
        status: r.status,
        confirmedBy: r.confirmedBy,
        confirmedAt: r.confirmedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  /** 确认对账 */
  async confirmReconciliation(id: string, operatorId: string) {
    const rec = await this.prisma.monthlyReconciliation.findUniqueOrThrow({ where: { id } });
    if (rec.status !== 'pending') {
      throw new BadRequestException('Only pending reconciliations can be confirmed');
    }
    await this.prisma.monthlyReconciliation.update({
      where: { id },
      data: { status: 'confirmed', confirmedBy: operatorId, confirmedAt: new Date() },
    });
    return { success: true };
  }

  /** 逾期应收账款 */
  async getOverdueReceivables(brandId: string) {
    const now = new Date();
    return this.prisma.receivable.findMany({
      where: {
        brandId,
        dueDate: { lt: now },
        status: { in: ['pending', 'partial'] },
      },
      include: { order: true, store: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
    });
  }

  /** 检查并更新逾期状态 */
  async checkOverdue(brandId: string) {
    const now = new Date();
    const updated = await this.prisma.receivable.updateMany({
      where: {
        brandId,
        dueDate: { lt: now },
        status: { in: ['pending', 'partial'] },
      },
      data: { status: 'overdue' },
    });
    // Also count total overdue
    const overdueCount = await this.prisma.receivable.count({
      where: { brandId, status: 'overdue' },
    });
    return { updated: updated.count, overdueCount };
  }

  /** 对账统计（Dashboard 用） */
  async getReconciliationStats(brandId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 当月充值总额
    const monthlyRecharge = await this.prisma.accountTransaction.aggregate({
      where: {
        brandId,
        transType: 'recharge',
        createdAt: { gte: monthStart },
      },
      _sum: { amount: true },
    });

    // 逾期应收账款数量
    const overdueCount = await this.prisma.receivable.count({
      where: { brandId, status: 'overdue' },
    });

    return {
      monthlyRecharge: monthlyRecharge._sum.amount || 0,
      overdueCount,
    };
  }

  /** 还款 */
  async repay(orderId: string, amountFen: number, storeId: string) {
    const receivable = await this.prisma.receivable.findFirst({
      where: { orderId, storeId, status: { in: ['pending', 'partial'] } },
    });
    if (!receivable) throw new BadRequestException('No pending receivable found');

    const paidAmount = receivable.paidAmount + amountFen;
    const status = paidAmount >= receivable.amount ? 'paid' : 'partial';

    await this.prisma.receivable.update({
      where: { id: receivable.id },
      data: { paidAmount, status, settledAt: status === 'paid' ? new Date() : null },
    });
    return { success: true, paidAmount, status };
  }
}
