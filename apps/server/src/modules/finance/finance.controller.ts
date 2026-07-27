import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { RequirePermission } from '../../common/decorators/require-permission';
import { BrandContext } from '../../common/decorators/brand-context';

@Controller('finance')
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  /** 加盟店查自己的账户 */
  @Get('my-account')
  @RequirePermission('account:view')
  async getMyAccount(@BrandContext() ctx: any) {
    return this.financeService.getAccount(ctx.orgId);
  }

  /** 加盟店查自己的流水 */
  @Get('my-transactions')
  @RequirePermission('account:view')
  async getMyTransactions(@BrandContext() ctx: any, @Query('page') page?: string) {
    return this.financeService.getTransactions(ctx.orgId, page ? parseInt(page) : 1);
  }

  /** 总部查看应收账款 */
  @Get('receivables')
  @RequirePermission('finance:view')
  async getReceivables(@BrandContext() ctx: any, @Query('storeId') storeId?: string, @Query('status') status?: string) {
    return this.financeService.getReceivables(ctx.brandId, storeId, status);
  }

  /** 还款 */
  @Post('repay')
  @RequirePermission('account:view')
  async repay(@BrandContext() ctx: any, @Body() dto: { orderId: string; amountFen: number }) {
    return this.financeService.repay(dto.orderId, dto.amountFen, ctx.orgId);
  }

  /** 生成月度对账 */
  @Post('reconciliation/generate')
  @RequirePermission('finance:manage')
  async generateReconciliation(@BrandContext() ctx: any, @Body() dto: { period: string }) {
    return this.financeService.generateReconciliation(ctx.brandId, dto.period);
  }

  /** 对账列表 */
  @Get('reconciliations')
  @RequirePermission('finance:view')
  async listReconciliations(
    @BrandContext() ctx: any,
    @Query('storeId') storeId?: string,
    @Query('period') period?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
  ) {
    return this.financeService.listReconciliations(ctx.brandId, { storeId, period, status, page: page ? parseInt(page) : 1 });
  }

  /** 确认对账 */
  @Post('reconciliation/:id/confirm')
  @RequirePermission('finance:manage')
  async confirmReconciliation(@Param('id') id: string, @BrandContext() ctx: any) {
    return this.financeService.confirmReconciliation(id, ctx.userId);
  }

  /** 逾期应收账款 */
  @Get('receivables/overdue')
  @RequirePermission('finance:view')
  async getOverdueReceivables(@BrandContext() ctx: any) {
    return this.financeService.getOverdueReceivables(ctx.brandId);
  }

  /** 检查并更新逾期 */
  @Post('receivables/check-overdue')
  @RequirePermission('finance:manage')
  async checkOverdue(@BrandContext() ctx: any) {
    return this.financeService.checkOverdue(ctx.brandId);
  }

  /** 对账统计（Dashboard 用） */
  @Get('reconciliation/stats')
  @RequirePermission('finance:view')
  async getReconciliationStats(@BrandContext() ctx: any) {
    return this.financeService.getReconciliationStats(ctx.brandId);
  }
}
