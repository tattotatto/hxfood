import { Controller, Get } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RequirePermission } from '../../common/decorators/require-permission';
import { RoleVo } from '@hxfood/shared-types';

@Controller('rbac')
export class RbacController {
  constructor(private rbacService: RbacService) {}

  @Get('roles')
  @RequirePermission('*:*')
  async getRoles(): Promise<RoleVo[]> {
    return this.rbacService.getRoles();
  }
}
