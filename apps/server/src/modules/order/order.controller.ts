import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { OrderService } from './order.service';
import { RequirePermission } from '../../common/decorators/require-permission';
import { BrandContext } from '../../common/decorators/brand-context';
import { CurrentUser } from '../../common/decorators/current-user';
import { JwtPayload } from '@hxfood/shared-types';

@Controller('orders')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post()
  @RequirePermission('order:create')
  async createOrder(
    @Body() dto: any,
    @BrandContext() ctx: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orderService.createOrder(dto, ctx.brandId, ctx.orgId, user.sub);
  }

  @Get()
  @RequirePermission('order:view')
  async findOrders(
    @BrandContext() ctx: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.orderService.findOrders(
      ctx.brandId,
      ctx.orgId,
      status,
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 20,
    );
  }

  @Get(':id')
  @RequirePermission('order:view')
  async getOrderDetail(@Param('id') id: string) {
    return this.orderService.getOrderDetail(id);
  }

  @Post(':id/approve')
  @RequirePermission('order:approve')
  async approve(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.orderService.transition(id, 'approved', user.sub, 'super_admin', '审核通过');
  }

  @Post(':id/reject')
  @RequirePermission('order:approve')
  async reject(
    @Param('id') id: string,
    @Body('comment') comment: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orderService.transition(id, 'rejected', user.sub, 'super_admin', comment || '审核驳回');
  }

  @Post(':id/cancel')
  @RequirePermission('order:cancel')
  async cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.orderService.transition(id, 'cancelled', user.sub, user.roles[0], '取消订单');
  }

  @Post(':id/receive')
  @RequirePermission('order:view')
  async receive(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.orderService.transition(id, 'received', user.sub, 'store_admin', '确认收货');
  }
}
