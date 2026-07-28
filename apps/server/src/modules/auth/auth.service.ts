import { Injectable, UnauthorizedException } from '@nestjs/common';
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
