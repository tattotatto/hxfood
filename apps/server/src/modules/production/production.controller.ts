import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ProductionService } from './production.service';
import { RequirePermission } from '../../common/decorators/require-permission';
import { BrandContext } from '../../common/decorators/brand-context';
import { CurrentUser } from '../../common/decorators/current-user';
import { JwtPayload } from '@hxfood/shared-types';

@Controller('production')
export class ProductionController {
  constructor(private productionService: ProductionService) {}

  @Get('orders')
  @RequirePermission('production:view')
  async listOrders(@BrandContext() ctx: any, @Query('status') status?: string, @Query('page') page?: string) {
    return this.productionService.listProductionOrders(ctx.brandId, { status, page: page ? parseInt(page) : undefined });
  }

  @Post('orders')
  @RequirePermission('production:manage')
  async createOrder(@BrandContext() ctx: any, @Body() dto: any) {
    return this.productionService.createProductionOrder(ctx.brandId, dto);
  }

  @Post('orders/:orderId/start')
  @RequirePermission('production:manage')
  async startProduction(@Param('orderId') orderId: string, @BrandContext() ctx: any, @CurrentUser() user: JwtPayload) {
    return this.productionService.startProduction(orderId, ctx.brandId, user.sub);
  }

  @Post('complete')
  @RequirePermission('production:manage')
  async complete(@BrandContext() ctx: any, @Body() dto: any) {
    return this.productionService.completeProduction(ctx.brandId, dto);
  }
}
