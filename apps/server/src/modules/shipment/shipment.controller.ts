import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ShipmentService } from './shipment.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { ShipDto } from './dto/ship.dto';
import { ReceiveDto } from './dto/receive.dto';
import { RequirePermission } from '../../common/decorators/require-permission';
import { BrandContext } from '../../common/decorators/brand-context';
import { CurrentUser } from '../../common/decorators/current-user';
import { JwtPayload } from '@hxfood/shared-types';

@Controller('shipment')
export class ShipmentController {
  constructor(private shipmentService: ShipmentService) {}

  @Post()
  @RequirePermission('inventory:manage')
  async createShipment(@Body() dto: CreateShipmentDto, @BrandContext() ctx: any, @CurrentUser() user: JwtPayload) {
    return this.shipmentService.createShipment(dto, ctx.brandId, user.sub);
  }

  @Get()
  @RequirePermission('inventory:view')
  async listShipments(@BrandContext() ctx: any, @Query('orderId') orderId?: string, @Query('status') status?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.shipmentService.listShipments(ctx.brandId, { orderId, status, page: page ? parseInt(page) : undefined, pageSize: pageSize ? parseInt(pageSize) : undefined });
  }

  @Get(':id')
  @RequirePermission('inventory:view')
  async getShipment(@Param('id') id: string) {
    return this.shipmentService.getShipment(id);
  }

  @Post(':id/ship')
  @RequirePermission('inventory:manage')
  async ship(@Param('id') id: string, @Body() dto: ShipDto, @CurrentUser() user: JwtPayload) {
    return this.shipmentService.ship(id, dto, user.sub);
  }

  @Post(':id/receive')
  @RequirePermission('product:view')
  async receive(@Param('id') id: string, @Body() dto: ReceiveDto, @BrandContext() ctx: any) {
    return this.shipmentService.receive(id, dto, ctx.orgId);
  }

  @Post(':id/cancel')
  @RequirePermission('inventory:manage')
  async cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.shipmentService.cancelShipment(id, user.sub);
  }
}
