import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class OrgService {
  constructor(private prisma: PrismaService) {}

  // ── 加盟申请 ──

  async submitFranchiseApplication(brandId: string, dto: {
    name: string; contactName: string; contactPhone: string;
    city: string; address: string; investmentBudget: number;
    applicantOpenid?: string; remark?: string;
  }) {
    // 创建待审核的加盟店组织
    return this.prisma.organization.create({
      data: {
        brandId,
        name: dto.name,
        orgType: 'franchise_store',
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        address: { city: dto.city, detail: dto.address },
        status: 'inactive',  // 待审核
        config: {
          investmentBudget: dto.investmentBudget,
          applicantOpenid: dto.applicantOpenid,
          remark: dto.remark,
          applicationStatus: 'pending',  // pending / approved / rejected / signed
          appliedAt: new Date().toISOString(),
        },
      },
    });
  }

  async listApplications(brandId: string, status?: string) {
    const where: any = { brandId, orgType: 'franchise_store', status: 'inactive' };
    return this.prisma.organization.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveApplication(orgId: string, approved: boolean, reviewerId: string, comment?: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Application not found');

    const config: any = { ...(org.config as any || {}) };
    if (approved) {
      config.applicationStatus = 'approved';
      config.approvedAt = new Date().toISOString();
      config.approvedBy = reviewerId;
      config.approvalComment = comment;

      // 激活组织并创建账户
      await this.prisma.organization.update({
        where: { id: orgId },
        data: { status: 'active', config },
      });

      await this.prisma.storeAccount.create({
        data: { brandId: org.brandId, storeId: orgId, balance: 0, creditLimit: 0 },
      });
    } else {
      config.applicationStatus = 'rejected';
      config.rejectedAt = new Date().toISOString();
      config.rejectedBy = reviewerId;
      config.rejectionReason = comment;
      await this.prisma.organization.update({
        where: { id: orgId },
        data: { config },
      });
    }
    return { success: true, status: config.applicationStatus };
  }

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
