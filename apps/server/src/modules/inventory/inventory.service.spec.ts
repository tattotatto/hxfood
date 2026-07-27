import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../common/prisma/prisma.service';

const mockPrisma: any = {
  inventory: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
  inventoryTransaction: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  warehouse: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  order: {
    findUnique: jest.fn(),
  },
};
mockPrisma.$transaction = jest.fn((cb: any) => cb(mockPrisma));

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    jest.clearAllMocks();
  });

  describe('lockStock', () => {
    const skuId = 'sku-001';
    const warehouseId = 'wh-001';
    const brandId = 'brand-001';
    const orderNo = 'ORD001';

    it('picks earliest expiry first (FIFO)', async () => {
      // Three batches: expiry dates ascending
      const batches = [
        { id: 'batch-1', lotNo: 'LOT001', quantity: 100, lockedQty: 0, warehouseId, skuId, brandId, expiryAt: new Date('2026-08-01') },
        { id: 'batch-2', lotNo: 'LOT002', quantity: 50,  lockedQty: 0, warehouseId, skuId, brandId, expiryAt: new Date('2026-09-01') },
        { id: 'batch-3', lotNo: 'LOT003', quantity: 200, lockedQty: 0, warehouseId, skuId, brandId, expiryAt: new Date('2026-10-01') },
      ];

      mockPrisma.inventory.findMany.mockResolvedValue(batches);
      mockPrisma.inventory.update.mockResolvedValue({});
      mockPrisma.inventoryTransaction.create.mockResolvedValue({});

      const result = await service.lockStock(skuId, warehouseId, brandId, 60, orderNo);

      // FIFO: first batch (100 available) should be locked for 60 units
      // Second batch shouldn't be touched since first has enough
      expect(mockPrisma.inventory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ expiryAt: 'asc' }, { producedAt: 'asc' }],
        }),
      );

      // Should only lock from batch-1 (first by expiry)
      const updateCalls = (mockPrisma.inventory.update as jest.Mock).mock.calls;
      expect(updateCalls.length).toBe(1);
      expect(updateCalls[0][0].where.id).toBe('batch-1');
      expect(updateCalls[0][0].data.lockedQty).toBe(60); // 0 + 60

      expect(result.success).toBe(true);
      expect(result.locks).toEqual([{ lotNo: 'LOT001', qty: 60 }]);
    });

    it('partially locks across multiple batches when first batch insufficient', async () => {
      const batches = [
        { id: 'batch-1', lotNo: 'LOT001', quantity: 30, lockedQty: 0, warehouseId, skuId, brandId, expiryAt: new Date('2026-08-01') },
        { id: 'batch-2', lotNo: 'LOT002', quantity: 50, lockedQty: 0, warehouseId, skuId, brandId, expiryAt: new Date('2026-09-01') },
        { id: 'batch-3', lotNo: 'LOT003', quantity: 100, lockedQty: 0, warehouseId, skuId, brandId, expiryAt: new Date('2026-10-01') },
      ];

      mockPrisma.inventory.findMany.mockResolvedValue(batches);
      mockPrisma.inventory.update.mockResolvedValue({});
      mockPrisma.inventoryTransaction.create.mockResolvedValue({});

      const result = await service.lockStock(skuId, warehouseId, brandId, 100, orderNo);

      // Should lock from batch-1 (30) + batch-2 (50) + batch-3 (20)
      const updateCalls = (mockPrisma.inventory.update as jest.Mock).mock.calls;
      expect(updateCalls.length).toBe(3);
      expect(updateCalls[0][0].where.id).toBe('batch-1');
      expect(updateCalls[0][0].data.lockedQty).toBe(30);
      expect(updateCalls[1][0].where.id).toBe('batch-2');
      expect(updateCalls[1][0].data.lockedQty).toBe(50);
      expect(updateCalls[2][0].where.id).toBe('batch-3');
      expect(updateCalls[2][0].data.lockedQty).toBe(20);

      expect(result.locks).toEqual([
        { lotNo: 'LOT001', qty: 30 },
        { lotNo: 'LOT002', qty: 50 },
        { lotNo: 'LOT003', qty: 20 },
      ]);
    });

    it('fails when insufficient total stock', async () => {
      const batches = [
        { id: 'batch-1', lotNo: 'LOT001', quantity: 10, lockedQty: 5, warehouseId, skuId, brandId, expiryAt: new Date('2026-08-01') }, // available: 5
        { id: 'batch-2', lotNo: 'LOT002', quantity: 5,  lockedQty: 5, warehouseId, skuId, brandId, expiryAt: new Date('2026-09-01') }, // available: 0
      ];

      mockPrisma.inventory.findMany.mockResolvedValue(batches);
      mockPrisma.inventory.update.mockResolvedValue({});
      mockPrisma.inventoryTransaction.create.mockResolvedValue({});

      await expect(
        service.lockStock(skuId, warehouseId, brandId, 50, orderNo),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.lockStock(skuId, warehouseId, brandId, 50, orderNo),
      ).rejects.toThrow('Insufficient stock');
    });

    it('respects already-locked quantities', async () => {
      const batches = [
        { id: 'batch-1', lotNo: 'LOT001', quantity: 100, lockedQty: 80, warehouseId, skuId, brandId, expiryAt: new Date('2026-08-01') }, // available: 20
        { id: 'batch-2', lotNo: 'LOT002', quantity: 50,  lockedQty: 0,  warehouseId, skuId, brandId, expiryAt: new Date('2026-09-01') }, // available: 50
      ];

      mockPrisma.inventory.findMany.mockResolvedValue(batches);
      mockPrisma.inventory.update.mockResolvedValue({});
      mockPrisma.inventoryTransaction.create.mockResolvedValue({});

      const result = await service.lockStock(skuId, warehouseId, brandId, 30, orderNo);

      // First batch available is 20, so picks 20 from batch-1 and 10 from batch-2
      const updateCalls = (mockPrisma.inventory.update as jest.Mock).mock.calls;
      expect(updateCalls.length).toBe(2);
      expect(updateCalls[0][0].data.lockedQty).toBe(100); // 80 + 20
      expect(updateCalls[1][0].data.lockedQty).toBe(10);  // 0 + 10

      expect(result.locks).toEqual([
        { lotNo: 'LOT001', qty: 20 },
        { lotNo: 'LOT002', qty: 10 },
      ]);
    });

    it('skips batches with zero available stock', async () => {
      const batches = [
        { id: 'batch-1', lotNo: 'LOT001', quantity: 50, lockedQty: 50, warehouseId, skuId, brandId, expiryAt: new Date('2026-08-01') }, // available: 0
        { id: 'batch-2', lotNo: 'LOT002', quantity: 30, lockedQty: 0,  warehouseId, skuId, brandId, expiryAt: new Date('2026-09-01') }, // available: 30
      ];

      mockPrisma.inventory.findMany.mockResolvedValue(batches);
      mockPrisma.inventory.update.mockResolvedValue({});
      mockPrisma.inventoryTransaction.create.mockResolvedValue({});

      const result = await service.lockStock(skuId, warehouseId, brandId, 20, orderNo);

      // batch-1 has no available, should skip directly to batch-2
      const updateCalls = (mockPrisma.inventory.update as jest.Mock).mock.calls;
      expect(updateCalls.length).toBe(1);
      expect(updateCalls[0][0].where.id).toBe('batch-2');
      expect(updateCalls[0][0].data.lockedQty).toBe(20);
    });

    it('creates inventory transaction records for each lock', async () => {
      const batches = [
        { id: 'batch-1', lotNo: 'LOT001', quantity: 40, lockedQty: 0, warehouseId, skuId, brandId, expiryAt: new Date('2026-08-01') },
        { id: 'batch-2', lotNo: 'LOT002', quantity: 30, lockedQty: 0, warehouseId, skuId, brandId, expiryAt: new Date('2026-09-01') },
      ];

      mockPrisma.inventory.findMany.mockResolvedValue(batches);
      mockPrisma.inventory.update.mockResolvedValue({});
      mockPrisma.inventoryTransaction.create.mockResolvedValue({});

      await service.lockStock(skuId, warehouseId, brandId, 50, orderNo);

      const txCalls = (mockPrisma.inventoryTransaction.create as jest.Mock).mock.calls;
      expect(txCalls.length).toBe(2);
      expect(txCalls[0][0].data).toMatchObject({
        transType: 'lock',
        lotNo: 'LOT001',
        bizType: 'order',
        bizNo: orderNo,
        quantity: -40,
      });
      expect(txCalls[1][0].data).toMatchObject({
        transType: 'lock',
        lotNo: 'LOT002',
        bizType: 'order',
        bizNo: orderNo,
        quantity: -10,
      });
    });
  });

  describe('unlockStock', () => {
    const brandId = 'brand-001';
    const orderNo = 'ORD001';

    it('releases locks by finding previous lock transactions', async () => {
      const lockTxs = [
        { warehouseId: 'wh-1', skuId: 'sku-1', lotNo: 'LOT001', quantity: -30, transType: 'lock', bizNo: orderNo, brandId },
        { warehouseId: 'wh-1', skuId: 'sku-1', lotNo: 'LOT002', quantity: -20, transType: 'lock', bizNo: orderNo, brandId },
      ];

      mockPrisma.inventoryTransaction.findMany.mockResolvedValue(lockTxs);
      mockPrisma.inventory.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.inventoryTransaction.create.mockResolvedValue({});

      const result = await service.unlockStock(orderNo, brandId);

      expect(mockPrisma.inventoryTransaction.findMany).toHaveBeenCalledWith({
        where: { bizNo: orderNo, transType: 'lock', brandId },
      });

      // Should unlock both lots
      expect(mockPrisma.inventory.updateMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.inventory.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ lotNo: 'LOT001' }),
          data: expect.objectContaining({ lockedQty: { decrement: 30 } }),
        }),
      );
      expect(mockPrisma.inventory.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ lotNo: 'LOT002' }),
          data: expect.objectContaining({ lockedQty: { decrement: 20 } }),
        }),
      );

      // Should create unlock transaction records
      const txCreateCalls = (mockPrisma.inventoryTransaction.create as jest.Mock).mock.calls;
      expect(txCreateCalls.length).toBe(2);
      expect(txCreateCalls[0][0].data.transType).toBe('unlock');
      expect(txCreateCalls[1][0].data.transType).toBe('unlock');

      expect(result.success).toBe(true);
    });

    it('does nothing when no lock transactions exist', async () => {
      mockPrisma.inventoryTransaction.findMany.mockResolvedValue([]);

      const result = await service.unlockStock(orderNo, brandId);

      expect(mockPrisma.inventory.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.inventoryTransaction.create).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });
});
