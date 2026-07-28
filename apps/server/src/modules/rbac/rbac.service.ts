import { Injectable, NotFoundException } from '@nestjs/common';
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

  async getRolesWithCount(): Promise<(RoleVo & { permissionCount: number })[]> {
    const roles = await this.prisma.role.findMany({
      include: {
        _count: { select: { rolePermissions: true } },
        rolePermissions: { include: { permission: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name ?? '',
      brandId: r.brandId ?? undefined,
      permissionCount: r._count.rolePermissions,
      permissions: r.rolePermissions.map((rp) => ({
        code: rp.permission.code,
        resource: rp.permission.resource ?? '',
        action: rp.permission.action ?? '',
        description: rp.permission.description ?? '',
      })),
    }));
  }

  async getRolePermissions(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { rolePermissions: { include: { permission: true } } },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const allPermissions = await this.prisma.permission.findMany({
      orderBy: { code: 'asc' },
    });

    const selectedIds = role.rolePermissions.map((rp) => rp.permissionId);

    return {
      role: { id: role.id, code: role.code, name: role.name },
      allPermissions: allPermissions.map((p) => ({
        id: p.id,
        code: p.code,
        resource: p.resource ?? '',
        action: p.action ?? '',
        description: p.description ?? '',
      })),
      selectedIds,
    };
  }

  async updateRolePermissions(roleId: string, permissionCodes: string[]) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
    });

    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    if (permissions.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId,
          permissionId: p.id,
        })),
      });
    }

    return { roleId, permissionCount: permissions.length };
  }
}
