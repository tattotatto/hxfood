import { Controller, Get, Put, Body } from '@nestjs/common';
import { ProductService } from './product.service';
import { RequirePermission } from '../../common/decorators/require-permission';
import { BrandContext } from '../../common/decorators/brand-context';

@Controller('brand')
export class BrandController {
  constructor(private productService: ProductService) {}

  @Get('settings')
  @RequirePermission('product:manage')
  async getSettings(@BrandContext() ctx: any) {
    return this.productService.getBrandSettings(ctx.brandId);
  }

  @Put('settings')
  @RequirePermission('product:manage')
  async updateSettings(
    @BrandContext() ctx: any,
    @Body() dto: { name?: string; config?: Record<string, any> },
  ) {
    return this.productService.updateBrandSettings(ctx.brandId, dto);
  }
}
