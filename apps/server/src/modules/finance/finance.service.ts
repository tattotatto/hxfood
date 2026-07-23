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
