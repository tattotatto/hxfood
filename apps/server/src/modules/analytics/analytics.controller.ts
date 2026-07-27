import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { RequirePermission } from '../../common/decorators/require-permission';
import { BrandContext } from '../../common/decorators/brand-context';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('summary')
  @RequirePermission('report:view', 'product:view')
  async getSummary(@BrandContext() ctx: any) {
    return this.analyticsService.getSummary(ctx.brandId);
  }

  @Get('order-trend')
  @RequirePermission('report:view', 'product:view')
  async getOrderTrend(@BrandContext() ctx: any) {
    return this.analyticsService.getOrderTrend(ctx.brandId);
  }

  @Get('hot-skus')
  @RequirePermission('report:view', 'product:view')
  async getHotSkus(@BrandContext() ctx: any) {
    return this.analyticsService.getHotSkus(ctx.brandId);
  }

  @Get('store-ranking')
  @RequirePermission('report:view', 'product:view')
  async getStoreRanking(@BrandContext() ctx: any) {
    return this.analyticsService.getStoreRanking(ctx.brandId);
  }
}
