import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { RequirePermission } from '../../common/decorators/require-permission';
import { BrandContext } from '../../common/decorators/brand-context';

@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get('warehouses')
  @RequirePermission('inventory:view')
  async getWarehouses(@BrandContext() ctx: any) {
    return this.inventoryService.getWarehouses(ctx.brandId);
  }

  @Post('warehouses')
  @RequirePermission('inventory:manage')
  async createWarehouse(@BrandContext() ctx: any, @Body() dto: any) {
    return this.inventoryService.createWarehouse(ctx.brandId, dto);
  }

  @Get()
  @RequirePermission('inventory:view')
  async getInventory(@BrandContext() ctx: any, @Query('skuId') skuId?: string, @Query('warehouseId') warehouseId?: string) {
    return this.inventoryService.getInventory(ctx.brandId, skuId, warehouseId);
  }

  @Post('inbound')
  @RequirePermission('inventory:manage')
  async inbound(@BrandContext() ctx: any, @Body() dto: any) {
    return this.inventoryService.inbound({ ...dto, brandId: ctx.brandId });
  }

  @Get('transactions')
  @RequirePermission('inventory:view')
  async getTransactions(@BrandContext() ctx: any, @Query('skuId') skuId?: string, @Query('page') page?: string) {
    return this.inventoryService.getTransactions(ctx.brandId, skuId, page ? parseInt(page) : 1);
  }
}
