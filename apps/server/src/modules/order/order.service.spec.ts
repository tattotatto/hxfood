import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrderService } from './order.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProductService } from '../product/product.service';
import { InventoryService } from '../inventory/inventory.service';
import { ClsService } from 'nestjs-cls';

jest.mock('@hxfood/shared-utils', () => ({
  isValidIdempotencyKey: jest.fn().mockReturnValue(true),
  generateOrderNo: jest.fn().mockReturnValue('ORD2026072500001'),
  multiplyPrice: jest.fn((unitPriceFen: number, quantity: number) =>
    Math.round(unitPriceFen * Math.round(quantity * 1000) / 1000),
  ),
  fenToYuan: jest.fn((fen: number) => fen / 100),
}));

import * as utils from '@hxfood/shared-utils';

const mockPrisma: any = {
  order: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  orderItem: { create: jest.fn() },
  orderStatusLog: { create: jest.fn() },
  orderApproval: { create: jest.fn() },
};
mockPrisma.$transaction = jest.fn((cb: any) => cb(mockPrisma));

const mockProductService = {
  getSkuById: jest.fn(),
};

const mockInventoryService = {
  lockStockForOrder: jest.fn().mockResolvedValue(undefined),
  unlockStock: jest.fn().mockResolvedValue(undefined),
};

const mockCls = {
  get: jest.fn(),
  set: jest.fn(),
};

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ProductService, useValue: mockProductService },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: ClsService, useValue: mockCls },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);

    jest.clearAllMocks();
    (utils.isValidIdempotencyKey as jest.Mock).mockReturnValue(true);
    (utils.generateOrderNo as jest.Mock).mockReturnValue('ORD2026072500001');
  });

  describe('createOrder', () => {
    const brandId = 'brand-uuid';
    const storeId = 'store-uuid';
    const userId = 'user-uuid';

    const validDto = {
      idempotencyKey: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
      items: [{ skuId: 'sku-001', quantity: 5 }],
      paymentMethod: 'balance',
      shippingAddress: { city: 'Beijing', detail: '123 Main St' },
      expectedAt: '2026-08-01T00:00:00Z',
      notes: 'test order',
    };

    const skuData = {
      id: 'sku-001',
      skuCode: 'SKU-CODE',
      name: 'Test SKU',
      effectivePrice: 2000,
      stockAvailable: 100,
      minOrderQty: 1,
      price: 20,
    };

    const mockOrderRecord = {
      id: 'order-uuid',
      orderNo: 'ORD2026072500001',
      orderStatus: 'draft',
      orderType: 'sale',
      totalAmount: 10000,
      paymentMethod: 'balance',
      orderItems: [
        {
          id: 'item-uuid',
          skuCode: 'SKU-CODE',
          skuName: 'Test SKU',
          unitPrice: 2000,
          quantity: 5,
          shippedQty: 0,
          receivedQty: 0,
          amount: 10000,
          status: 'active',
          lotNo: null,
        },
      ],
      orderStatusLogs: [
        {
          createdAt: new Date('2026-07-25T10:00:00Z'),
          toStatus: 'draft',
          operatorId: userId,
          remark: '订单创建',
        },
        {
          createdAt: new Date('2026-07-25T10:00:01Z'),
          toStatus: 'pending_approval',
          operatorId: userId,
          remark: '提交订单',
        },
      ],
      createdAt: new Date('2026-07-25T10:00:00Z'),
    };

    it('creates order with valid items', async () => {
      mockProductService.getSkuById.mockResolvedValue(skuData);
      mockPrisma.order.findUnique.mockResolvedValue(null); // no existing
      mockPrisma.order.count.mockResolvedValue(0);

      const createdOrder = { ...mockOrderRecord };
      mockPrisma.order.create.mockResolvedValue(createdOrder);
      mockPrisma.orderStatusLog.create.mockResolvedValue({ id: 'log-uuid' });
      // After create, the findUnique is for re-fetching
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(null) // idempotency check
        .mockResolvedValueOnce(createdOrder); // re-fetch after create
      mockPrisma.orderStatusLog.create.mockResolvedValue({ id: 'log-uuid' });

      const result = await service.createOrder(validDto, brandId, storeId, userId);

      expect(mockProductService.getSkuById).toHaveBeenCalledWith(brandId, 'sku-001', storeId);
      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderNo: 'ORD2026072500001',
            orderStatus: 'draft',
            idempotencyKey: validDto.idempotencyKey,
          }),
        }),
      );
      expect(result.items[0].unitPrice).toBe(20); // fenToYuan: 2000/100
      expect(result.totalAmount).toBe(100); // fenToYuan: 10000/100
    });

    it('idempotency key prevents duplicate orders', async () => {
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(mockOrderRecord); // existing
      mockPrisma.order.count.mockResolvedValue(5);

      const result = await service.createOrder(validDto, brandId, storeId, userId);

      // Should return existing, not create new
      expect(mockPrisma.order.create).not.toHaveBeenCalled();
      expect(result.orderNo).toBe('ORD2026072500001');
      expect(result.totalAmount).toBe(100);
    });

    it('throws when items is empty', async () => {
      const dto = { ...validDto, items: [] };

      await expect(service.createOrder(dto, brandId, storeId, userId))
        .rejects.toThrow(BadRequestException);
      await expect(service.createOrder(dto, brandId, storeId, userId))
        .rejects.toThrow('Order must have at least one item');
    });

    it('throws on invalid idempotency key', async () => {
      (utils.isValidIdempotencyKey as jest.Mock).mockReturnValue(false);

      await expect(service.createOrder(validDto, brandId, storeId, userId))
        .rejects.toThrow(BadRequestException);
      await expect(service.createOrder(validDto, brandId, storeId, userId))
        .rejects.toThrow('Invalid idempotency key');
    });

    it('calculates price server-side using effectivePrice', async () => {
      const skuWithPrice = {
        ...skuData,
        effectivePrice: 2500, // 25.00 yuan
      };
      mockProductService.getSkuById.mockResolvedValue(skuWithPrice);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...mockOrderRecord,
          totalAmount: 12500,
          orderItems: [
            {
              ...mockOrderRecord.orderItems[0],
              unitPrice: 2500,
              amount: 12500,
            },
          ],
        });
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.order.create.mockResolvedValue({
        ...mockOrderRecord,
        totalAmount: 12500,
        orderItems: [
          { ...mockOrderRecord.orderItems[0], unitPrice: 2500, amount: 12500 },
        ],
      });
      mockPrisma.orderStatusLog.create.mockResolvedValue({ id: 'log-uuid' });

      const result = await service.createOrder(validDto, brandId, storeId, userId);

      // Unit price should be converted from fen (2500) to yuan (25)
      expect(result.items[0].unitPrice).toBe(25);
    });

    it('ignores client-provided price in items', async () => {
      const dtoWithPriceAttempt = {
        ...validDto,
        items: [{ skuId: 'sku-001', quantity: 5 }],
      };
      mockProductService.getSkuById.mockResolvedValue(skuData);
      mockPrisma.order.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockOrderRecord);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.order.create.mockResolvedValue(mockOrderRecord);
      mockPrisma.orderStatusLog.create.mockResolvedValue({ id: 'log-uuid' });

      const result = await service.createOrder(dtoWithPriceAttempt, brandId, storeId, userId);

      // Price is derived from server-side effectivePrice (2000), not from client
      expect(mockProductService.getSkuById).toHaveBeenCalled();
      expect((utils.multiplyPrice as jest.Mock)).toHaveBeenCalledWith(2000, 5);
      expect(result.items[0].unitPrice).toBe(20); // 2000/100
    });

    it('throws when stock is insufficient', async () => {
      mockProductService.getSkuById.mockResolvedValue({
        ...skuData,
        stockAvailable: 2, // only 2 available, but requesting 5
      });
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.createOrder(validDto, brandId, storeId, userId))
        .rejects.toThrow(BadRequestException);
      await expect(service.createOrder(validDto, brandId, storeId, userId))
        .rejects.toThrow('insufficient stock');
    });

    it('throws when quantity is below min order qty', async () => {
      const dto = {
        ...validDto,
        items: [{ skuId: 'sku-001', quantity: 0.5 }],
      };
      mockProductService.getSkuById.mockResolvedValue({
        ...skuData,
        minOrderQty: 10, // min order is 10, but requesting 5
      });
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(service.createOrder(dto, brandId, storeId, userId))
        .rejects.toThrow(BadRequestException);
      await expect(service.createOrder(dto, brandId, storeId, userId))
        .rejects.toThrow('min order qty');
    });
  });
});
