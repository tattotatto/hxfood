import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FranchiseService } from './franchise.service';
import { PrismaService } from '../../common/prisma/prisma.service';

const mockPrisma: any = {
  franchiseApplication: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  organization: {
    create: jest.fn(),
  },
  storeAccount: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  accountTransaction: {
    create: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
  },
  role: {
    findFirst: jest.fn(),
  },
  userOrgRole: {
    create: jest.fn(),
  },
};
mockPrisma.$transaction = jest.fn((cb: any) => cb(mockPrisma));

describe('FranchiseService', () => {
  let service: FranchiseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FranchiseService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FranchiseService>(FranchiseService);
    jest.clearAllMocks();
  });

  const makeApp = (overrides: Record<string, any> = {}) => ({
    id: 'app-001',
    brandId: 'brand-001',
    applicantName: 'Test Applicant',
    applicantPhone: '13800138000',
    applicantOpenid: 'wxopenid_123',
    storeName: 'Test Store',
    city: 'Beijing',
    address: '123 Test St',
    investmentBudget: 100000,
    status: 'submitted',
    reviewerId: null,
    reviewComment: null,
    reviewedAt: null,
    paymentConfirmedBy: null,
    paymentConfirmedAt: null,
    paymentRemark: null,
    activatedAt: null,
    createdOrgId: null,
    remark: null,
    documents: {},
    createdAt: new Date('2026-07-01T00:00:00Z'),
    updatedAt: new Date('2026-07-01T00:00:00Z'),
    ...overrides,
  });

  const validCreateDto = {
    brandId: 'brand-001',
    applicantName: 'Test Applicant',
    applicantPhone: '13800138000',
    applicantOpenid: 'wxopenid_123',
    storeName: 'Test Store',
    city: 'Beijing',
    address: '123 Test St',
    investmentBudget: 100000,
    remark: 'I want to join',
  };

  describe('submitApplication', () => {
    it('creates application with correct status "submitted"', async () => {
      const created = makeApp({ status: 'submitted' });
      mockPrisma.franchiseApplication.create.mockResolvedValue(created);

      const result = await service.submitApplication(validCreateDto);

      expect(mockPrisma.franchiseApplication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            brandId: validCreateDto.brandId,
            applicantName: validCreateDto.applicantName,
            applicantPhone: validCreateDto.applicantPhone,
            storeName: validCreateDto.storeName,
            city: validCreateDto.city,
            address: validCreateDto.address,
            status: 'submitted',
          }),
        }),
      );
      expect(result.status).toBe('submitted');
    });

    it('handles null applicantOpenid', async () => {
      const dto = { ...validCreateDto, applicantOpenid: undefined };
      mockPrisma.franchiseApplication.create.mockResolvedValue(makeApp({ applicantOpenid: null }));

      const result = await service.submitApplication(dto);

      expect(mockPrisma.franchiseApplication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            applicantOpenid: null,
          }),
        }),
      );
    });
  });

  describe('reviewApplication', () => {
    const reviewerId = 'reviewer-uuid';

    it('transitions submitted → approved with approved=true', async () => {
      const app = makeApp({ status: 'submitted' });
      mockPrisma.franchiseApplication.findUnique.mockResolvedValue(app);
      const updated = { ...app, status: 'approved', reviewerId };
      mockPrisma.franchiseApplication.update.mockResolvedValue(updated);

      const result = await service.reviewApplication(app.id, { approved: true }, reviewerId);

      expect(mockPrisma.franchiseApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'approved',
            reviewerId,
          }),
        }),
      );
      expect(result.status).toBe('approved');
    });

    it('transitions submitted → rejected with approved=false', async () => {
      const app = makeApp({ status: 'submitted' });
      mockPrisma.franchiseApplication.findUnique.mockResolvedValue(app);
      const updated = { ...app, status: 'rejected', reviewerId, reviewComment: 'Not qualified' };
      mockPrisma.franchiseApplication.update.mockResolvedValue(updated);

      const result = await service.reviewApplication(
        app.id,
        { approved: false, comment: 'Not qualified' },
        reviewerId,
      );

      expect(mockPrisma.franchiseApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'rejected',
            reviewComment: 'Not qualified',
          }),
        }),
      );
      expect(result.status).toBe('rejected');
    });

    it('rejection requires comment', async () => {
      await expect(
        service.reviewApplication('app-001', { approved: false }, reviewerId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.reviewApplication('app-001', { approved: false }, reviewerId),
      ).rejects.toThrow('Rejection reason (comment) is required');
    });

    it('also allows review from under_review status', async () => {
      const app = makeApp({ status: 'under_review' });
      mockPrisma.franchiseApplication.findUnique.mockResolvedValue(app);
      const updated = { ...app, status: 'approved', reviewerId };
      mockPrisma.franchiseApplication.update.mockResolvedValue(updated);

      const result = await service.reviewApplication(app.id, { approved: true }, reviewerId);

      expect(result.status).toBe('approved');
    });

    it('blocks review for non-reviewable statuses', async () => {
      const app = makeApp({ status: 'activated' });
      mockPrisma.franchiseApplication.findUnique.mockResolvedValue(app);

      await expect(
        service.reviewApplication(app.id, { approved: true }, reviewerId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.reviewApplication(app.id, { approved: true }, reviewerId),
      ).rejects.toThrow('Cannot review application in status');
    });

    it('throws NotFoundException when application does not exist', async () => {
      mockPrisma.franchiseApplication.findUnique.mockResolvedValue(null);

      await expect(
        service.reviewApplication('non-existent', { approved: true }, reviewerId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('confirmPayment', () => {
    const operatorId = 'operator-uuid';

    it('transitions approved → payment_confirmed', async () => {
      const app = makeApp({ status: 'approved' });
      mockPrisma.franchiseApplication.findUnique.mockResolvedValue(app);
      const updated = {
        ...app,
        status: 'payment_confirmed',
        paymentConfirmedBy: operatorId,
        paymentConfirmedAt: new Date(),
      };
      mockPrisma.franchiseApplication.update.mockResolvedValue(updated);

      const result = await service.confirmPayment(app.id, { remark: 'Paid 50000' }, operatorId);

      expect(mockPrisma.franchiseApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'payment_confirmed',
            paymentConfirmedBy: operatorId,
            paymentRemark: 'Paid 50000',
          }),
        }),
      );
      expect(result.status).toBe('payment_confirmed');
    });

    it('blocks confirmPayment if status is not approved', async () => {
      const app = makeApp({ status: 'submitted' });
      mockPrisma.franchiseApplication.findUnique.mockResolvedValue(app);

      await expect(
        service.confirmPayment(app.id, { remark: 'test' }, operatorId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.confirmPayment(app.id, { remark: 'test' }, operatorId),
      ).rejects.toThrow('Cannot confirm payment for status');
    });

    it('handles null remark gracefully', async () => {
      const app = makeApp({ status: 'approved' });
      mockPrisma.franchiseApplication.findUnique.mockResolvedValue(app);
      mockPrisma.franchiseApplication.update.mockResolvedValue({
        ...app,
        status: 'payment_confirmed',
        paymentRemark: null,
      });

      const result = await service.confirmPayment(app.id, {}, operatorId);

      expect(result.status).toBe('payment_confirmed');
    });
  });

  describe('activate', () => {
    const operatorId = 'operator-uuid';

    it('creates org + account + role in transaction', async () => {
      const app = makeApp({ status: 'payment_confirmed' });
      mockPrisma.franchiseApplication.findUnique.mockResolvedValue(app);

      const org = { id: 'org-001', brandId: app.brandId, name: app.storeName };
      mockPrisma.organization.create.mockResolvedValue(org);
      mockPrisma.storeAccount.create.mockResolvedValue({ id: 'acct-001' });

      // applicant has openid, so user/role linkage should happen
      const user = { id: 'user-001', openid: app.applicantOpenid };
      mockPrisma.user.findFirst.mockResolvedValue(user);
      const role = { id: 'role-001', brandId: app.brandId, code: 'store_admin' };
      mockPrisma.role.findFirst.mockResolvedValue(role);
      mockPrisma.userOrgRole.create.mockResolvedValue({ id: 'uor-001' });

      mockPrisma.franchiseApplication.update.mockResolvedValue({
        ...app,
        status: 'activated',
        createdOrgId: org.id,
      });

      const result = await service.activate(app.id, operatorId);

      // 1. Organization created
      expect(mockPrisma.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            brandId: app.brandId,
            orgType: 'franchise_store',
            name: app.storeName,
            contactName: app.applicantName,
            contactPhone: app.applicantPhone,
            status: 'active',
          }),
        }),
      );

      // 2. StoreAccount created
      expect(mockPrisma.storeAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            brandId: app.brandId,
            storeId: org.id,
            balance: 0,
            creditLimit: 0,
          }),
        }),
      );

      // 3. User-Org-Role created
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { openid: app.applicantOpenid },
      });
      expect(mockPrisma.role.findFirst).toHaveBeenCalledWith({
        where: { brandId: app.brandId, code: 'store_admin' },
      });
      expect(mockPrisma.userOrgRole.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: user.id,
          orgId: org.id,
          roleId: role.id,
          isDefault: true,
        }),
      });

      // 4. Application updated to activated
      expect(mockPrisma.franchiseApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'activated',
            createdOrgId: org.id,
          }),
        }),
      );

      expect(result.org).toBe(org);
      expect(result.applicationId).toBe(app.id);
    });

    it('blocks activation on wrong status', async () => {
      const app = makeApp({ status: 'approved' }); // not payment_confirmed
      mockPrisma.franchiseApplication.findUnique.mockResolvedValue(app);

      await expect(
        service.activate(app.id, operatorId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.activate(app.id, operatorId),
      ).rejects.toThrow('Cannot activate application in status');
    });

    it('blocks activation on submitted status', async () => {
      const app = makeApp({ status: 'submitted' });
      mockPrisma.franchiseApplication.findUnique.mockResolvedValue(app);

      await expect(
        service.activate(app.id, operatorId),
      ).rejects.toThrow(BadRequestException);
    });

    it('skips user-role linking when applicant has no openid', async () => {
      const app = makeApp({ status: 'payment_confirmed', applicantOpenid: null });
      mockPrisma.franchiseApplication.findUnique.mockResolvedValue(app);

      const org = { id: 'org-002', brandId: app.brandId, name: app.storeName };
      mockPrisma.organization.create.mockResolvedValue(org);
      mockPrisma.storeAccount.create.mockResolvedValue({ id: 'acct-002' });
      mockPrisma.franchiseApplication.update.mockResolvedValue({
        ...app,
        status: 'activated',
        createdOrgId: org.id,
      });

      await service.activate(app.id, operatorId);

      // User/role lookup should NOT be called
      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.role.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.userOrgRole.create).not.toHaveBeenCalled();
    });

    it('skips user-org-role when user not found', async () => {
      const app = makeApp({ status: 'payment_confirmed' });
      mockPrisma.franchiseApplication.findUnique.mockResolvedValue(app);

      const org = { id: 'org-003', brandId: app.brandId, name: app.storeName };
      mockPrisma.organization.create.mockResolvedValue(org);
      mockPrisma.storeAccount.create.mockResolvedValue({ id: 'acct-003' });
      mockPrisma.user.findFirst.mockResolvedValue(null); // user not found
      mockPrisma.franchiseApplication.update.mockResolvedValue({
        ...app,
        status: 'activated',
        createdOrgId: org.id,
      });

      await service.activate(app.id, operatorId);

      expect(mockPrisma.role.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.userOrgRole.create).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('cancels own application from submitted status', async () => {
      const app = makeApp({ status: 'submitted', applicantOpenid: 'wxopenid_123' });
      mockPrisma.franchiseApplication.findUnique.mockResolvedValue(app);
      mockPrisma.franchiseApplication.update.mockResolvedValue({ ...app, status: 'cancelled' });

      const result = await service.cancel(app.id, 'wxopenid_123');

      expect(mockPrisma.franchiseApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'cancelled' },
        }),
      );
      expect(result.status).toBe('cancelled');
    });

    it('cancels from under_review status', async () => {
      const app = makeApp({ status: 'under_review', applicantOpenid: 'wxopenid_123' });
      mockPrisma.franchiseApplication.findUnique.mockResolvedValue(app);
      mockPrisma.franchiseApplication.update.mockResolvedValue({ ...app, status: 'cancelled' });

      const result = await service.cancel(app.id, 'wxopenid_123');

      expect(result.status).toBe('cancelled');
    });

    it('blocks cancel for non-owner', async () => {
      const app = makeApp({ status: 'submitted', applicantOpenid: 'wxopenid_123' });
      mockPrisma.franchiseApplication.findUnique.mockResolvedValue(app);

      // Different openid attempts to cancel
      await expect(
        service.cancel(app.id, 'wxopenid_999'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.cancel(app.id, 'wxopenid_999'),
      ).rejects.toThrow('Not your application');
    });

    it('blocks cancel when application is not in cancellable status', async () => {
      const app = makeApp({ status: 'approved', applicantOpenid: 'wxopenid_123' });
      mockPrisma.franchiseApplication.findUnique.mockResolvedValue(app);

      await expect(
        service.cancel(app.id, 'wxopenid_123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.cancel(app.id, 'wxopenid_123'),
      ).rejects.toThrow('Cannot cancel application in status');
    });

    it('allows cancel when applicantOpenid is null (no openid restriction)', async () => {
      const app = makeApp({ status: 'submitted', applicantOpenid: null });
      mockPrisma.franchiseApplication.findUnique.mockResolvedValue(app);
      mockPrisma.franchiseApplication.update.mockResolvedValue({ ...app, status: 'cancelled' });

      const result = await service.cancel(app.id, 'any_openid');

      // Should not throw ForbiddenException because applicantOpenid is null
      expect(result.status).toBe('cancelled');
    });

    it('throws NotFoundException when application does not exist', async () => {
      mockPrisma.franchiseApplication.findUnique.mockResolvedValue(null);

      await expect(
        service.cancel('non-existent', 'wxopenid_123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listApplications', () => {
    it('queries with brandId and optional status filter', async () => {
      const apps = [makeApp(), makeApp({ id: 'app-002', status: 'approved' })];
      mockPrisma.franchiseApplication.findMany.mockResolvedValue(apps);
      mockPrisma.franchiseApplication.count.mockResolvedValue(2);

      const result = await service.listApplications('brand-001', { status: 'submitted' });

      expect(mockPrisma.franchiseApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { brandId: 'brand-001', status: 'submitted' },
          skip: 0,
          take: 20,
        }),
      );
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('defaults to page 1 and pageSize 20', async () => {
      mockPrisma.franchiseApplication.findMany.mockResolvedValue([]);
      mockPrisma.franchiseApplication.count.mockResolvedValue(0);

      await service.listApplications('brand-001', {});

      expect(mockPrisma.franchiseApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });
  });
});
