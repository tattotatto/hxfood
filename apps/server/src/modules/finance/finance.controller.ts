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
}
