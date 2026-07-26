import {
  Controller, Get, Post, Body, Param, Query,
} from '@nestjs/common';
import { FranchiseService } from './franchise.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { Public } from '../../common/decorators/public';
import { RequirePermission } from '../../common/decorators/require-permission';
import { BrandContext } from '../../common/decorators/brand-context';
import { CurrentUser } from '../../common/decorators/current-user';
import { JwtPayload } from '@hxfood/shared-types';

@Controller('franchise')
export class FranchiseController {
  constructor(private franchiseService: FranchiseService) {}

  /** 提交加盟申请 — 公开接口 */
  @Public()
  @Post('applications')
  async submitApplication(@Body() dto: CreateApplicationDto) {
    return this.franchiseService.submitApplication(dto);
  }

  /** 总部查询申请列表 */
  @Get('applications')
  @RequirePermission('store:view')
  async listApplications(
    @BrandContext() ctx: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.franchiseService.listApplications(ctx.brandId, {
      status,
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
    });
  }

  /** 总部查看申请详情 */
  @Get('applications/:id')
  @RequirePermission('store:view')
  async getApplication(@Param('id') id: string) {
    return this.franchiseService.getApplication(id);
  }

  /** 加盟者查看自己的申请进度 */
  @Get('my-applications')
  @RequirePermission('product:view')
  async getMyApplications(@CurrentUser() user: JwtPayload) {
    return this.franchiseService.getMyApplications(user.openid || '');
  }

  /** 总部审核 */
  @Post('applications/:id/review')
  @RequirePermission('store:view')
  async reviewApplication(
    @Param('id') id: string,
    @Body() dto: ReviewApplicationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.franchiseService.reviewApplication(id, dto, user.sub);
  }

  /** 总部确认缴费 */
  @Post('applications/:id/confirm-payment')
  @RequirePermission('store:view')
  async confirmPayment(
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.franchiseService.confirmPayment(id, dto, user.sub);
  }

  /** 总部激活 */
  @Post('applications/:id/activate')
  @RequirePermission('store:view')
  async activate(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.franchiseService.activate(id, user.sub);
  }

  /** 加盟者主动撤销 */
  @Post('applications/:id/cancel')
  @RequirePermission('product:view')
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.franchiseService.cancel(id, user.openid || '');
  }
}
