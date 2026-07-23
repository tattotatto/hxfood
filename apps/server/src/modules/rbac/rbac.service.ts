import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RoleVo } from '@hxfood/shared-types';

@Injectable()
export class RbacService {
  constructor(private prisma: PrismaService) {}

  async getRoles(brandId?: string): Promise<RoleVo[]> {
    const roles = await this.prisma.role.findMany({
      where: brandId ? { OR: [{ brandId }, { brandId: null }] } : {},
      include: { rolePermissions: { include: { permission: true } } },
    });
    return roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name ?? '',
      brandId: r.brandId ?? undefined,
      permissions: r.rolePermissions.map((rp) => ({
        code: rp.permission.code,
        resource: rp.permission.resource ?? '',
        action: rp.permission.action ?? '',
        description: rp.permission.description ?? '',
      })),
    }));
  }
}
