import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ProductService } from './product.service';
import { RequirePermission } from '../../common/decorators/require-permission';
import { BrandContext } from '../../common/decorators/brand-context';

@Controller('products')
export class ProductController {
  constructor(private productService: ProductService) {}

  // ── 分类 ──
  @Get('categories')
  @RequirePermission('product:view')
  async getCategories(@BrandContext() ctx: any) {
    return this.productService.getCategories(ctx.brandId);
  }

  @Post('categories')
  @RequirePermission('product:manage')
  async createCategory(@BrandContext() ctx: any, @Body() dto: any) {
    return this.productService.createCategory(ctx.brandId, dto);
  }

  // ── SPU ──
  @Get('spus')
  @RequirePermission('product:view')
  async getSpus(
    @BrandContext() ctx: any,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.productService.getSpus(ctx.brandId, categoryId);
  }

  @Post('spus')
  @RequirePermission('product:manage')
  async createSpu(@BrandContext() ctx: any, @Body() dto: any) {
    return this.productService.createSpu(ctx.brandId, dto);
  }

  // ── SKU — 加盟店查商品（含价格+库存） ──
  @Get('skus')
  @RequirePermission('product:view')
  async getSkus(@BrandContext() ctx: any) {
    return this.productService.getSkus(ctx.brandId, ctx.orgId);
  }

  @Get('skus/:id')
  @RequirePermission('product:view')
  async getSkuById(@BrandContext() ctx: any, @Param('id') id: string) {
    return this.productService.getSkuById(ctx.brandId, id, ctx.orgId);
  }

  // ── 价格策略 ──
  @Get('price-policies')
  @RequirePermission('product:manage')
  async getPricePolicies(
    @BrandContext() ctx: any,
    @Query('skuId') skuId: string,
  ) {
    return this.productService.getPricePolicies(ctx.brandId, skuId);
  }

  @Post('price-policies')
  @RequirePermission('product:manage')
  async createPricePolicy(@BrandContext() ctx: any, @Body() dto: any) {
    return this.productService.createPricePolicy(ctx.brandId, dto);
  }
}
