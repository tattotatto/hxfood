import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RequirePermission } from '../../common/decorators/require-permission';
import { RoleVo } from '@hxfood/shared-types';

@Controller('roles')
export class RbacController {
  constructor(private rbacService: RbacService) {}

  @Get()
  @RequirePermission('store:view')
  async getRoles(): Promise<(RoleVo & { permissionCount: number })[]> {
    return this.rbacService.getRolesWithCount();
  }

  @Get(':id/permissions')
  @RequirePermission('store:view')
  async getRolePermissions(@Param('id') id: string) {
    return this.rbacService.getRolePermissions(id);
  }

  @Put(':id/permissions')
  @RequirePermission('store:view')
  async updateRolePermissions(
    @Param('id') id: string,
    @Body() dto: { permissions: string[] },
  ) {
    return this.rbacService.updateRolePermissions(id, dto.permissions);
  }
}
