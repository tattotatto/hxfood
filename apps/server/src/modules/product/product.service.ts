import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SkuVo } from '@hxfood/shared-types';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  // ── 分类 ──
  async getCategories(brandId: string) {
    return this.prisma.category.findMany({
      where: { brandId },
      orderBy: { sortOrder: 'asc' },
      include: { children: true },
    });
  }

  async createCategory(
    brandId: string,
    dto: { name: string; parentId?: string; sortOrder?: number },
  ) {
    // path 是 Unsupported("ltree")，Prisma 不生成类型，需通过 raw SQL 读写
    let path: string;
    if (dto.parentId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await (this.prisma as any).$queryRawUnsafe(
        `SELECT "path"::text as "path" FROM categories WHERE id = $1`,
        dto.parentId,
      ) as Array<{ path: string }>;
      path = rows[0]?.path ? rows[0].path + '.' + dto.name : dto.name;
    } else {
      path = dto.name;
    }

    const category = await this.prisma.category.create({
      data: {
        brandId,
        name: dto.name,
        parentId: dto.parentId,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    // ltree 字段必须用 raw SQL 写入
    await this.prisma.$executeRawUnsafe(
      `UPDATE categories SET "path" = $1::ltree WHERE id = $2`,
      path,
      category.id,
    );

    return { ...category, path };
  }

  // ── SPU ──
  async getSpus(brandId: string, categoryId?: string) {
    return this.prisma.spu.findMany({
      where: {
        brandId,
        isActive: true,
        ...(categoryId ? { categoryId } : {}),
      },
      include: { category: true, skus: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSpu(
    brandId: string,
    dto: {
      categoryId?: string;
      name: string;
      spuCode: string;
      unit?: string;
      spec?: string;
      storageType?: string;
      shelfLifeDays?: number;
      images?: string[];
    },
  ) {
    return this.prisma.spu.create({
      data: {
        brandId,
        ...dto,
        storageType: (dto.storageType as any) || 'ambient',
      } as any,
    });
  }

  // ── SKU ──
  async getSkus(brandId: string, storeId: string): Promise<SkuVo[]> {
    // 加盟店查商品：带价格解析 + 库存
    const skus = await this.prisma.sku.findMany({
      where: { brandId, isActive: true },
      include: {
        spu: true,
        pricePolicies: true,
        inventories: { where: { status: 'normal' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return skus.map((sku) => {
      const effectivePrice = this.resolvePrice(
        sku.pricePolicies,
        storeId,
        sku.price,
      );
      const totalAvailable = sku.inventories.reduce(
        (sum: number, inv) => sum + (inv.quantity - inv.lockedQty),
        0,
      );
      return {
        id: sku.id,
        skuCode: sku.skuCode,
        name: sku.spu.name,
        specDetail: sku.specDetail || '',
        price: effectivePrice / 100, // 分→元
        stockAvailable: totalAvailable,
        minOrderQty: sku.minOrderQty,
        stepOrderQty: sku.stepOrderQty,
        images: (sku.spu.images as string[]) || [],
      };
    });
  }

  async getSkuById(brandId: string, skuId: string, storeId: string) {
    const sku = await this.prisma.sku.findUnique({
      where: { id: skuId, brandId },
      include: {
        spu: true,
        pricePolicies: true,
        inventories: { where: { status: 'normal' } },
      },
    });
    if (!sku) throw new Error('SKU not found');
    const price = this.resolvePrice(sku.pricePolicies, storeId, sku.price);
    const stock = sku.inventories.reduce(
      (s: number, i) => s + (i.quantity - i.lockedQty),
      0,
    );
    return { ...sku, effectivePrice: price, stockAvailable: stock };
  }

  /** 价格解析：合同价 > 活动价 > 等级价 > 基准价 */
  private resolvePrice(
    policies: any[],
    _storeId: string,
    basePrice: number,
  ): number {
    const now = new Date();
    const active = policies.filter(
      (p) =>
        (!p.startAt || new Date(p.startAt) <= now) &&
        (!p.endAt || new Date(p.endAt) >= now),
    );
    const priority = ['contract', 'promotion', 'store_level', 'default'];
    for (const type of priority) {
      const match = active.find((p) => p.policyType === type);
      if (match) return match.price;
    }
    return basePrice;
  }

  // ── 价格策略 ──
  async getPricePolicies(brandId: string, skuId: string) {
    return this.prisma.pricePolicy.findMany({ where: { brandId, skuId } });
  }

  async createPricePolicy(
    brandId: string,
    dto: {
      skuId: string;
      policyType: string;
      targetId?: string;
      price: number;
      startAt?: string;
      endAt?: string;
    },
  ) {
    return this.prisma.pricePolicy.create({
      data: { brandId, ...dto } as any,
    });
  }

  // ── 品牌设置 ──

  async getBrandSettings(brandId: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return {
      id: brand.id,
      name: brand.name,
      code: brand.code,
      status: brand.status,
      config: brand.config || {},
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
    };
  }

  async updateBrandSettings(
    brandId: string,
    dto: { name?: string; config?: Record<string, any> },
  ) {
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
    });
    if (!brand) throw new NotFoundException('Brand not found');

    const data: Record<string, any> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.config !== undefined) data.config = dto.config;

    const updated = await this.prisma.brand.update({
      where: { id: brandId },
      data,
    });

    return {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      status: updated.status,
      config: updated.config || {},
      updatedAt: updated.updatedAt,
    };
  }

  // ── 品牌公开接口 ──
  async getBrands() {
    const brands = await this.prisma.brand.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: {
        organizations: {
          where: { orgType: 'franchise_store', status: 'active' },
          select: { id: true },
        },
      },
    });

    return brands.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      logo: (b.config as any)?.logo || null,
      description: (b.config as any)?.description || '',
      storeCount: b.organizations.length,
    }));
  }

  async getBrandDetail(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        organizations: {
          where: { orgType: 'franchise_store', status: 'active' },
          select: { id: true },
        },
      },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return {
      id: brand.id,
      name: brand.name,
      code: brand.code,
      config: brand.config || {},
      storeCount: brand.organizations.length,
      createdAt: brand.createdAt,
    };
  }
}
