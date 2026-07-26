import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class OrgService {
  constructor(private prisma: PrismaService) {}

  // ── 组织管理 ──

  async getOrganizations(brandId: string, orgType?: string) {
    const where: any = { brandId };
    if (orgType) where.orgType = orgType;
    return this.prisma.organization.findMany({
      where,
      include: { storeAccount: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrgDetail(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { storeAccount: true, children: true },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return {
      ...org,
      balance: org.storeAccount ? org.storeAccount.balance / 100 : 0,
      creditLimit: org.storeAccount ? org.storeAccount.creditLimit / 100 : 0,
    };
  }

  async updateOrg(orgId: string, dto: {
    name?: string; contactName?: string; contactPhone?: string; address?: any; status?: string;
  }) {
    return this.prisma.organization.update({
      where: { id: orgId },
      data: { ...dto, status: dto.status as any },
    });
  }

  // ── 门店信息（加盟店自管理） ──

  async getMyStore(orgId: string) {
    return this.getOrgDetail(orgId);
  }

  async updateMyStore(orgId: string, dto: { contactName?: string; contactPhone?: string; address?: any }) {
    return this.updateOrg(orgId, dto);
  }
}
