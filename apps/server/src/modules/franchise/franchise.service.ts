import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

@Injectable()
export class FranchiseService {
  constructor(private prisma: PrismaService) {}

  // ── 提交加盟申请（公开接口）──
  async submitApplication(dto: CreateApplicationDto) {
    return this.prisma.franchiseApplication.create({
      data: {
        brandId: dto.brandId,
        applicantName: dto.applicantName,
        applicantPhone: dto.applicantPhone,
        storeName: dto.storeName,
        city: dto.city,
        address: dto.address,
        investmentBudget: dto.investmentBudget,
        remark: dto.remark,
        status: 'submitted',
      },
    });
  }

  // ── 总部查询申请列表 ──
  async listApplications(brandId: string, params: { status?: string; page?: number; pageSize?: number }) {
    const where: any = { brandId };
    if (params.status) where.status = params.status;
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;

    const [items, total] = await Promise.all([
      this.prisma.franchiseApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { brand: { select: { id: true, name: true } } },
      }),
      this.prisma.franchiseApplication.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  // ── 总部查看申请详情 ──
  async getApplication(id: string) {
    const app = await this.prisma.franchiseApplication.findUnique({
      where: { id },
      include: {
        brand: { select: { id: true, name: true } },
        reviewer: { select: { id: true, realName: true } },
        paymentConfirmer: { select: { id: true, realName: true } },
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  // ── 加盟者查看自己的申请 ──
  async getMyApplications(openid: string) {
    return this.prisma.franchiseApplication.findMany({
      where: { applicantOpenid: openid },
      orderBy: { createdAt: 'desc' },
      include: { brand: { select: { id: true, name: true } } },
    });
  }

  // ── 总部审核 ──
  async reviewApplication(id: string, dto: ReviewApplicationDto, reviewerId: string) {
    const app = await this.prisma.franchiseApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== 'submitted' && app.status !== 'under_review') {
      throw new BadRequestException(`Cannot review application in status: ${app.status}`);
    }

    if (!dto.approved && !dto.comment) {
      throw new BadRequestException('Rejection reason (comment) is required');
    }

    return this.prisma.franchiseApplication.update({
      where: { id },
      data: {
        status: dto.approved ? 'approved' : 'rejected',
        reviewerId,
        reviewComment: dto.comment || null,
        reviewedAt: new Date(),
      },
    });
  }

  // ── 总部确认缴费 ──
  async confirmPayment(id: string, dto: ConfirmPaymentDto, operatorId: string) {
    const app = await this.prisma.franchiseApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== 'approved') {
      throw new BadRequestException(`Cannot confirm payment for status: ${app.status}`);
    }

    return this.prisma.franchiseApplication.update({
      where: { id },
      data: {
        status: 'payment_confirmed',
        paymentConfirmedBy: operatorId,
        paymentConfirmedAt: new Date(),
        paymentRemark: dto.remark || null,
      },
    });
  }

  // ── 总部激活（创建组织+账户+角色）──
  async activate(id: string, operatorId: string) {
    const app = await this.prisma.franchiseApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== 'payment_confirmed') {
      throw new BadRequestException(`Cannot activate application in status: ${app.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. 创建 Organization
      const org = await tx.organization.create({
        data: {
          brandId: app.brandId,
          orgType: 'franchise_store',
          name: app.storeName,
          contactName: app.applicantName,
          contactPhone: app.applicantPhone,
          address: { city: app.city, detail: app.address },
          status: 'active',
        },
      });

      // 2. 创建 StoreAccount
      await tx.storeAccount.create({
        data: {
          brandId: app.brandId,
          storeId: org.id,
          balance: 0,
          creditLimit: 0,
        },
      });

      // 3. 如果申请者有 openid，关联用户到门店管理员角色
      if (app.applicantOpenid) {
        const user = await tx.user.findFirst({
          where: { openid: app.applicantOpenid },
        });
        if (user) {
          const storeAdminRole = await tx.role.findFirst({
            where: { brandId: app.brandId, code: 'store_admin' },
          });
          if (storeAdminRole) {
            await tx.userOrgRole.create({
              data: {
                userId: user.id,
                orgId: org.id,
                roleId: storeAdminRole.id,
                isDefault: true,
              },
            });
          }
        }
      }

      // 4. 更新申请为已激活
      await tx.franchiseApplication.update({
        where: { id },
        data: {
          status: 'activated',
          createdOrgId: org.id,
          activatedAt: new Date(),
        },
      });

      return { org, applicationId: id };
    });
  }

  // ── 加盟者主动撤销 ──
  async cancel(id: string, openid: string) {
    const app = await this.prisma.franchiseApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== 'submitted' && app.status !== 'under_review') {
      throw new BadRequestException(`Cannot cancel application in status: ${app.status}`);
    }
    if (app.applicantOpenid && app.applicantOpenid !== openid) {
      throw new ForbiddenException('Not your application');
    }

    return this.prisma.franchiseApplication.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }
}
