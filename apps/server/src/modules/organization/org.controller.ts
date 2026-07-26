import { Controller, Get, Put, Body, Param, Query } from '@nestjs/common';
import { OrgService } from './org.service';
import { RequirePermission } from '../../common/decorators/require-permission';
import { BrandContext } from '../../common/decorators/brand-context';

@Controller('organizations')
export class OrgController {
  constructor(private orgService: OrgService) {}

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
