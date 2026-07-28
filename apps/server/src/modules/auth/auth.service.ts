import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtPayload, TokenResponse, UserProfile } from '@hxfood/shared-types';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private cls: ClsService,
  ) {}

  async login(
    username: string,
    password: string,
    brandId?: string,
  ): Promise<TokenResponse> {
    const user = await this.prisma.user.findFirst({ where: { username } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.passwordHash!);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.generateTokens(user.id, brandId);
  }

  async wechatLogin(code: string, brandId?: string): Promise<TokenResponse> {
    // Phase 2: 对接真实微信 code2session API
    let user = await this.prisma.user.findFirst({ where: { openid: code } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          openid: code,
          realName: `WX_${code.substring(0, 8)}`,
          status: 'active',
        },
      });
    }
    return this.generateTokens(user.id, brandId);
  }

  async refresh(refreshToken: string): Promise<TokenResponse> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      });
      return this.generateTokens(payload.sub, payload.brands[0]);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userOrgRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
            org: { include: { brand: true } },
          },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const orgs = user.userOrgRoles.map((uor) => ({
      id: uor.org.id,
      name: uor.org.name,
      orgType: uor.org.orgType,
      brandId: uor.org.brandId,
      brandName: uor.org.brand.name,
      roles: [uor.role.code],
      permissions: uor.role.rolePermissions.map((rp) => rp.permission.code),
    }));
    return {
      id: user.id,
      username: user.username || '',
      realName: user.realName || '',
      phone: user.phone || '',
      avatar: user.avatar || '',
      orgs,
      currentOrg: orgs[0],
    };
  }

  // ── User management ──

  async listUsers() {
    const users = await this.prisma.user.findMany({
      where: { status: 'active' },
      include: {
        userOrgRoles: {
          include: {
            org: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      username: u.username || '',
      realName: u.realName || '',
      phone: u.phone || '',
      avatar: u.avatar || '',
      status: u.status,
      createdAt: u.createdAt,
      orgRoles: u.userOrgRoles.map((uor) => ({
        orgId: uor.orgId,
        orgName: uor.org.name,
        roleId: uor.roleId,
        roleName: uor.role.name || uor.role.code,
        isDefault: uor.isDefault,
      })),
    }));
  }

  async createUser(dto: {
    username: string;
    password: string;
    realName?: string;
    phone?: string;
    orgId: string;
    roleId: string;
  }) {
    const existing = await this.prisma.user.findFirst({
      where: { username: dto.username },
    });
    if (existing) {
      throw new BadRequestException('Username already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        realName: dto.realName,
        phone: dto.phone,
        status: 'active',
      },
    });

    await this.prisma.userOrgRole.create({
      data: {
        userId: user.id,
        orgId: dto.orgId,
        roleId: dto.roleId,
        isDefault: true,
      },
    });

    return { id: user.id, username: user.username };
  }

  async updateUser(
    id: string,
    dto: {
      username?: string;
      password?: string;
      realName?: string;
      phone?: string;
      orgId?: string;
      roleId?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data: Record<string, any> = {};
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.realName !== undefined) data.realName = dto.realName;
    if (dto.phone !== undefined) data.phone = dto.phone;

    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });

    if (dto.orgId && dto.roleId) {
      const existingUor = await this.prisma.userOrgRole.findFirst({
        where: { userId: id },
      });
      if (existingUor) {
        await this.prisma.userOrgRole.update({
          where: { id: existingUor.id },
          data: { orgId: dto.orgId, roleId: dto.roleId },
        });
      } else {
        await this.prisma.userOrgRole.create({
          data: {
            userId: id,
            orgId: dto.orgId,
            roleId: dto.roleId,
            isDefault: true,
          },
        });
      }
    }

    return { id: updated.id, username: updated.username };
  }

  async deactivateUser(id: string, operatorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.id === operatorId) {
      throw new BadRequestException('Cannot deactivate yourself');
    }

    await this.prisma.user.update({
      where: { id },
      data: { status: 'disabled' },
    });

    return { id, status: 'disabled' };
  }

  private async generateTokens(
    userId: string,
    brandId?: string,
  ): Promise<TokenResponse> {
    const userOrgs = await this.prisma.userOrgRole.findMany({
      where: { userId },
      include: {
        org: true,
        role: {
          include: {
            rolePermissions: { include: { permission: true } },
          },
        },
      },
    });
    if (userOrgs.length === 0) {
      throw new UnauthorizedException('User has no organization');
    }
    let activeOrgs = userOrgs;
    if (brandId) {
      activeOrgs = userOrgs.filter((uor) => uor.org.brandId === brandId);
      if (activeOrgs.length === 0) {
        throw new UnauthorizedException('No access to this brand');
      }
    }
    const defaultOrg =
      activeOrgs.find((u) => u.isDefault) || activeOrgs[0];
    const brands: string[] = [...new Set(activeOrgs.map((u: any) => u.org.brandId))] as string[];
    const roles: string[] = activeOrgs.map((u: any) => u.role.code) as string[];
    const permissions: string[] = ([
      ...new Set(
        activeOrgs.flatMap((u: any) =>
          u.role.rolePermissions.map((rp: any) => rp.permission.code),
        ),
      ),
    ]) as string[];
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const payload: JwtPayload = {
      sub: userId,
      orgId: defaultOrg.org.id,
      orgType: defaultOrg.org.orgType,
      brands,
      roles,
      permissions,
      openid: user?.openid || undefined,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '2h' });
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      expiresIn: '7d',
    });
    return { accessToken, refreshToken, expiresIn: 7200 };
  }
}
