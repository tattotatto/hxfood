import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PrismaService } from '../../common/prisma/prisma.service';

const mockPrisma: any = {
  order: {
    findUnique: jest.fn(),
  },
  storeAccount: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  accountTransaction: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
};
mockPrisma.$transaction = jest.fn((cb: any) => cb(mockPrisma));

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    jest.clearAllMocks();
  });

  describe('payByBalance', () => {
    const orderId = 'order-uuid';
    const brandId = 'brand-uuid';
    const storeId = 'store-uuid';
    const amountFen = 10000; // 100 yuan

    it('deducts balance correctly', async () => {
      const account = {
        storeId,
        balance: 50000, // 500 yuan
        frozenAmount: 0,
      };
      mockPrisma.storeAccount.findUnique.mockResolvedValue(account);
      mockPrisma.storeAccount.update.mockResolvedValue({
        ...account,
        balance: 40000,
      });
      mockPrisma.accountTransaction.create.mockResolvedValue({ id: 'txn-uuid' });

      const result = await service.payByBalance(orderId, brandId, storeId, amountFen);

      expect(mockPrisma.storeAccount.findUnique).toHaveBeenCalledWith({ where: { storeId } });
      expect(mockPrisma.storeAccount.update).toHaveBeenCalledWith({
        where: { storeId },
        data: expect.objectContaining({ balance: 40000 }),
      });
      expect(mockPrisma.accountTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          brandId,
          storeId,
          orderId,
          transType: 'order_pay',
          amount: -amountFen,
          balanceAfter: 40000,
          remark: '余额支付',
        }),
      });

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(40000);
    });

    it('fails on insufficient balance', async () => {
      const account = {
        storeId,
        balance: 5000, // only 50 yuan
        frozenAmount: 0,
      };
      mockPrisma.storeAccount.findUnique.mockResolvedValue(account);
      // Transaction callback: findUnique returns the account, but balance check fails
      mockPrisma.$transaction.mockImplementationOnce(async (cb: any) => {
        // Simulate the actual transaction logic: findUnique returns account,
        // but 5000 - 0 < 10000 so it throws
        return cb({
          ...mockPrisma,
          storeAccount: {
            ...mockPrisma.storeAccount,
            findUnique: jest.fn().mockResolvedValue(account),
          },
        });
      });

      await expect(
        service.payByBalance(orderId, brandId, storeId, amountFen),
      ).rejects.toThrow(BadRequestException);
    });

    it('fails when account does not exist', async () => {
      // $transaction callback: findUnique returns null
      mockPrisma.$transaction.mockImplementationOnce(async (cb: any) => {
        return cb({
          ...mockPrisma,
          storeAccount: {
            ...mockPrisma.storeAccount,
            findUnique: jest.fn().mockResolvedValue(null),
          },
        });
      });

      await expect(
        service.payByBalance(orderId, brandId, storeId, amountFen),
      ).rejects.toThrow(BadRequestException);
    });

    it('considers frozenAmount when checking balance', async () => {
      const account = {
        storeId,
        balance: 20000, // 200 yuan
        frozenAmount: 12000, // 120 yuan frozen, available: 80 yuan
      };
      mockPrisma.storeAccount.findUnique.mockResolvedValue(account);

      // Available = 20000 - 12000 = 8000 < 10000
      await expect(
        service.payByBalance(orderId, brandId, storeId, amountFen),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows payment when balance minus frozen equals exactly the amount', async () => {
      const account = {
        storeId,
        balance: 15000,
        frozenAmount: 5000, // available: 10000 = amountFen
      };
      mockPrisma.storeAccount.findUnique.mockResolvedValue(account);
      mockPrisma.storeAccount.update.mockResolvedValue({ ...account, balance: 5000 });
      mockPrisma.accountTransaction.create.mockResolvedValue({ id: 'txn-uuid' });

      const result = await service.payByBalance(orderId, brandId, storeId, amountFen);

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(5000);
    });
  });

  describe('recharge', () => {
    const brandId = 'brand-uuid';
    const dto = {
      storeId: 'store-uuid',
      amountFen: 50000,
      remark: '季度充值',
    };

    it('increases balance correctly', async () => {
      const account = { storeId: dto.storeId, balance: 10000 };
      mockPrisma.storeAccount.findUniqueOrThrow.mockResolvedValue(account);
      mockPrisma.storeAccount.update.mockResolvedValue({ ...account, balance: 60000 });
      mockPrisma.accountTransaction.create.mockResolvedValue({ id: 'txn-uuid' });

      const result = await service.recharge(dto, brandId);

      expect(mockPrisma.storeAccount.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { storeId: dto.storeId },
      });
      expect(mockPrisma.storeAccount.update).toHaveBeenCalledWith({
        where: { storeId: dto.storeId },
        data: expect.objectContaining({ balance: 60000 }),
      });

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(60000);
    });

    it('creates accountTransaction with type recharge', async () => {
      const account = { storeId: dto.storeId, balance: 20000 };
      mockPrisma.storeAccount.findUniqueOrThrow.mockResolvedValue(account);
      mockPrisma.storeAccount.update.mockResolvedValue({ ...account, balance: 70000 });
      mockPrisma.accountTransaction.create.mockResolvedValue({ id: 'txn-uuid' });

      await service.recharge(dto, brandId);

      expect(mockPrisma.accountTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          brandId,
          storeId: dto.storeId,
          transType: 'recharge',
          amount: 50000,
          balanceAfter: 70000,
          remark: '季度充值',
        }),
      });
    });

    it('uses default remark when none provided', async () => {
      const dtoNoRemark = { storeId: 'store-uuid', amountFen: 10000 };
      const account = { storeId: dtoNoRemark.storeId, balance: 5000 };
      mockPrisma.storeAccount.findUniqueOrThrow.mockResolvedValue(account);
      mockPrisma.storeAccount.update.mockResolvedValue({ ...account, balance: 15000 });
      mockPrisma.accountTransaction.create.mockResolvedValue({ id: 'txn-uuid' });

      await service.recharge(dtoNoRemark, brandId);

      expect(mockPrisma.accountTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          remark: '管理员充值',
        }),
      });
    });

    it('accumulates balance from previous balance', async () => {
      const account = { storeId: dto.storeId, balance: 100000 }; // 1000 yuan
      mockPrisma.storeAccount.findUniqueOrThrow.mockResolvedValue(account);
      mockPrisma.storeAccount.update.mockResolvedValue({ ...account, balance: 150000 });
      mockPrisma.accountTransaction.create.mockResolvedValue({ id: 'txn-uuid' });

      const result = await service.recharge(dto, brandId);

      expect(result.newBalance).toBe(150000);
    });
  });

  describe('pay', () => {
    const brandId = 'brand-uuid';
    const storeId = 'store-uuid';

    it('routes to payByBalance when paymentMethod is balance', async () => {
      const order = {
        id: 'order-uuid',
        orderNo: 'ORD001',
        totalAmount: 5000, // 50 yuan
        orderStatus: 'approved',
        brandId,
        storeId,
        orderItems: [],
      };
      mockPrisma.order.findUnique.mockResolvedValue(order);

      const account = { storeId, balance: 10000, frozenAmount: 0 };
      mockPrisma.storeAccount.findUnique.mockResolvedValue(account);
      mockPrisma.storeAccount.update.mockResolvedValue({ ...account, balance: 5000 });
      mockPrisma.accountTransaction.create.mockResolvedValue({ id: 'txn-uuid' });

      const dto = { orderId: order.id, paymentMethod: 'balance' };
      const result: any = await service.pay(dto, brandId, storeId);

      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: order.id, brandId },
        include: { orderItems: true },
      });
      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(5000);
    });

    it('throws NotFoundException when order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      const dto = { orderId: 'non-existent', paymentMethod: 'balance' };
      await expect(service.pay(dto, brandId, storeId))
        .rejects.toThrow(NotFoundException);
    });

    it('throws when order status is not approved', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'order-uuid',
        orderStatus: 'draft',
        totalAmount: 5000,
        brandId,
        storeId,
        orderItems: [],
      });

      const dto = { orderId: 'order-uuid', paymentMethod: 'balance' };
      await expect(service.pay(dto, brandId, storeId))
        .rejects.toThrow(BadRequestException);
      await expect(service.pay(dto, brandId, storeId))
        .rejects.toThrow('Order must be approved before payment');
    });

    it('routes to wechat payment when paymentMethod is wechat', async () => {
      const order = {
        id: 'order-uuid',
        orderNo: 'ORD001',
        totalAmount: 5000,
        orderStatus: 'approved',
        brandId,
        storeId,
        orderItems: [],
      };
      mockPrisma.order.findUnique.mockResolvedValue(order);

      const dto = { orderId: order.id, paymentMethod: 'wechat' };
      const result = await service.pay(dto, brandId, storeId);

      expect(result).toMatchObject({
        prepayId: expect.stringContaining('mock_prepay_'),
        orderId: order.id,
        amountFen: 5000,
        status: 'pending',
      });
    });
  });
});
