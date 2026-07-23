import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { OrgService } from './org.service';
import { RequirePermission } from '../../common/decorators/require-permission';
import { BrandContext } from '../../common/decorators/brand-context';
import { CurrentUser } from '../../common/decorators/current-user';
import { JwtPayload } from '@hxfood/shared-types';
import { Public } from '../../common/decorators/public';

@Controller('organizations')
export class OrgController {
  constructor(private orgService: OrgService) {}

  // 加盟申请（公开 — 潜在加盟者通过小程序提交）
  @Public()
  @Post('franchise-apply')
  async franchiseApply(@Body() dto: any, @Query('brandId') brandId: string) {
    return this.orgService.submitFranchiseApplication(brandId || dto.brandId, dto);
  }

  // 加盟申请列表（总部审核用）
  @Get('applications')
  @RequirePermission('store:view')
  async listApplications(@BrandContext() ctx: any, @Query('status') status?: string) {
    return this.orgService.listApplications(ctx.brandId, status);
  }

  // 审核加盟申请
  @Post('applications/:id/approve')
  @RequirePermission('store:view')
  async approveApplication(
    @Param('id') id: string,
    @Body() dto: { approved: boolean; comment?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orgService.approveApplication(id, dto.approved, user.sub, dto.comment);
  }

  // 品牌下所有组织
  @Get()
  @RequirePermission('store:view')
  async getOrganizations(@BrandContext() ctx: any, @Query('orgType') orgType?: string) {
    return this.orgService.getOrganizations(ctx.brandId, orgType);
  }

  // 组织详情
  @Get(':id')
  @RequirePermission('store:view')
  async getOrgDetail(@Param('id') id: string) {
    return this.orgService.getOrgDetail(id);
  }

  // 更新组织
  @Put(':id')
  @RequirePermission('store:view')
  async updateOrg(@Param('id') id: string, @Body() dto: any) {
    return this.orgService.updateOrg(id, dto);
  }

  // 加盟店查看/编辑自己门店
  @Get('my-store/info')
  @RequirePermission('product:view')
  async getMyStore(@BrandContext() ctx: any) {
    return this.orgService.getMyStore(ctx.orgId);
  }

  @Put('my-store/info')
  @RequirePermission('product:view')
  async updateMyStore(@BrandContext() ctx: any, @Body() dto: any) {
    return this.orgService.updateMyStore(ctx.orgId, dto);
  }
}
