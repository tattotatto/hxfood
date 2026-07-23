import { Controller, Post, Body } from '@nestjs/common';
import { ProductionService } from './production.service';
import { RequirePermission } from '../../common/decorators/require-permission';
import { BrandContext } from '../../common/decorators/brand-context';

@Controller('production')
export class ProductionController {
  constructor(private productionService: ProductionService) {}

  @Post('orders')
  @RequirePermission('production:manage')
  async createOrder(@BrandContext() ctx: any, @Body() dto: any) {
    return this.productionService.createProductionOrder(ctx.brandId, dto);
  }

  @Post('complete')
  @RequirePermission('production:manage')
  async complete(@BrandContext() ctx: any, @Body() dto: any) {
    return this.productionService.completeProduction(ctx.brandId, dto);
  }
}
