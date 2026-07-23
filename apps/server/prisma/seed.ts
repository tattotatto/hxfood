import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── 品牌 ──
  const brandA = await prisma.brand.create({
    data: { name: '味优炸鸡', code: 'WYZJ' },
  });
  const brandB = await prisma.brand.create({
    data: { name: '面面聚道', code: 'MMJD' },
  });

  // ── 组织 ──
  const hqA = await prisma.organization.create({
    data: { brandId: brandA.id, name: '味优炸鸡总部', code: 'WYZJ-HQ', orgType: 'headquarters' },
  });
  const ckA = await prisma.organization.create({
    data: { brandId: brandA.id, parentId: hqA.id, name: '味优中央厨房', code: 'WYZJ-CK', orgType: 'central_kitchen' },
  });
  const storeA1 = await prisma.organization.create({
    data: { brandId: brandA.id, parentId: hqA.id, name: '味优炸鸡-北京朝阳店', code: 'WYZJ-001', orgType: 'franchise_store' },
  });
  const storeA2 = await prisma.organization.create({
    data: { brandId: brandA.id, parentId: hqA.id, name: '味优炸鸡-上海浦东店', code: 'WYZJ-002', orgType: 'franchise_store' },
  });
  const supA = await prisma.organization.create({
    data: { brandId: brandA.id, parentId: hqA.id, name: '泰森食品供应链', code: 'WYZJ-SUP01', orgType: 'supplier' },
  });

  const hqB = await prisma.organization.create({
    data: { brandId: brandB.id, name: '面面聚道总部', code: 'MMJD-HQ', orgType: 'headquarters' },
  });
  const storeB1 = await prisma.organization.create({
    data: { brandId: brandB.id, parentId: hqB.id, name: '面面聚道-广州天河店', code: 'MMJD-001', orgType: 'franchise_store' },
  });

  // ── 权限 ──
  const permDefs = [
    { code: 'order:create', resource: 'order', action: 'create', description: '创建订单' },
    { code: 'order:view', resource: 'order', action: 'view', description: '查看订单' },
    { code: 'order:approve', resource: 'order', action: 'approve', description: '审核订单' },
    { code: 'order:cancel', resource: 'order', action: 'cancel', description: '取消订单' },
    { code: 'product:view', resource: 'product', action: 'view', description: '查看商品' },
    { code: 'product:manage', resource: 'product', action: 'manage', description: '管理商品' },
    { code: 'finance:view', resource: 'finance', action: 'view', description: '查看财务' },
    { code: 'finance:manage', resource: 'finance', action: 'manage', description: '管理财务' },
    { code: 'inventory:view', resource: 'inventory', action: 'view', description: '查看库存' },
    { code: 'inventory:manage', resource: 'inventory', action: 'manage', description: '管理库存' },
    { code: 'production:view', resource: 'production', action: 'view', description: '查看生产' },
    { code: 'production:manage', resource: 'production', action: 'manage', description: '管理生产' },
    { code: 'shipment:create', resource: 'shipment', action: 'create', description: '创建发货' },
    { code: 'purchase_order:view', resource: 'purchase_order', action: 'view', description: '查看采购单' },
    { code: 'reconciliation:view', resource: 'reconciliation', action: 'view', description: '查看对账' },
    { code: 'store:view', resource: 'store', action: 'view', description: '查看门店' },
    { code: 'report:view', resource: 'report', action: 'view', description: '查看报表' },
    { code: 'account:view', resource: 'account', action: 'view', description: '查看账户' },
  ];

  for (const p of permDefs) {
    await prisma.permission.create({ data: p });
  }
  const allPerms = await prisma.permission.findMany();

  // ── 角色 ──
  // 总部超管（品牌A）
  const superAdminRole = await prisma.role.create({
    data: { brandId: brandA.id, code: 'super_admin', name: '总部超管' },
  });
  for (const p of allPerms) {
    await prisma.rolePermission.create({ data: { roleId: superAdminRole.id, permissionId: p.id } });
  }

  // 加盟店长（全局角色）
  const storeAdminPerms = ['order:create', 'order:view', 'order:cancel', 'product:view', 'account:view'];
  const storeAdminRole = await prisma.role.create({
    data: { code: 'store_admin', name: '加盟店长' },
  });
  for (const code of storeAdminPerms) {
    const p = allPerms.find(x => x.code === code);
    if (p) await prisma.rolePermission.create({ data: { roleId: storeAdminRole.id, permissionId: p.id } });
  }

  // CK管理员（品牌A）
  const ckPerms = ['production:view', 'production:manage', 'inventory:view', 'inventory:manage', 'shipment:create'];
  const ckAdminRole = await prisma.role.create({
    data: { brandId: brandA.id, code: 'ck_admin', name: '中央厨房管理员' },
  });
  for (const code of ckPerms) {
    const p = allPerms.find(x => x.code === code);
    if (p) await prisma.rolePermission.create({ data: { roleId: ckAdminRole.id, permissionId: p.id } });
  }

  // 供应商（品牌A）
  const supplierPerms = ['purchase_order:view', 'shipment:create', 'reconciliation:view'];
  const supplierRole = await prisma.role.create({
    data: { brandId: brandA.id, code: 'supplier', name: '供应商' },
  });
  for (const code of supplierPerms) {
    const p = allPerms.find(x => x.code === code);
    if (p) await prisma.rolePermission.create({ data: { roleId: supplierRole.id, permissionId: p.id } });
  }

  // ── 用户 ──
  const pwd = await bcrypt.hash('test123', 10);

  const adminUser = await prisma.user.create({
    data: { username: 'admin', passwordHash: pwd, realName: '系统管理员', phone: '13800000001' },
  });
  await prisma.userOrgRole.create({
    data: { userId: adminUser.id, orgId: hqA.id, roleId: superAdminRole.id, isDefault: true },
  });

  const storeUser = await prisma.user.create({
    data: { username: 'store01', passwordHash: pwd, realName: '北京朝阳店长', phone: '13800000002' },
  });
  await prisma.userOrgRole.create({
    data: { userId: storeUser.id, orgId: storeA1.id, roleId: storeAdminRole.id, isDefault: true },
  });

  const storeUser2 = await prisma.user.create({
    data: { username: 'store02', passwordHash: pwd, realName: '上海浦东店长', phone: '13800000003' },
  });
  await prisma.userOrgRole.create({
    data: { userId: storeUser2.id, orgId: storeA2.id, roleId: storeAdminRole.id, isDefault: true },
  });

  const ckUser = await prisma.user.create({
    data: { username: 'kitchen01', passwordHash: pwd, realName: '中央厨房管理员', phone: '13800000004' },
  });
  await prisma.userOrgRole.create({
    data: { userId: ckUser.id, orgId: ckA.id, roleId: ckAdminRole.id, isDefault: true },
  });

  const supUser = await prisma.user.create({
    data: { username: 'supplier01', passwordHash: pwd, realName: '供应商联系人', phone: '13800000005' },
  });
  await prisma.userOrgRole.create({
    data: { userId: supUser.id, orgId: supA.id, roleId: supplierRole.id, isDefault: true },
  });

  // 品牌B的加盟店
  const storeBUser = await prisma.user.create({
    data: { username: 'storeb01', passwordHash: pwd, realName: '广州天河店长', phone: '13800000006' },
  });
  await prisma.userOrgRole.create({
    data: { userId: storeBUser.id, orgId: storeB1.id, roleId: storeAdminRole.id, isDefault: true },
  });

  // ── 账户 ──
  await prisma.storeAccount.create({ data: { brandId: brandA.id, storeId: storeA1.id, balance: 100000, creditLimit: 50000 } });
  await prisma.storeAccount.create({ data: { brandId: brandA.id, storeId: storeA2.id, balance: 200000, creditLimit: 100000 } });
  await prisma.storeAccount.create({ data: { brandId: brandB.id, storeId: storeB1.id, balance: 150000, creditLimit: 80000 } });

  // ── 仓库 ──
  await prisma.warehouse.create({ data: { brandId: brandA.id, orgId: ckA.id, warehouseType: 'finished', name: '味优成品库' } });
  await prisma.warehouse.create({ data: { brandId: brandA.id, orgId: ckA.id, warehouseType: 'raw_material', name: '味优原料库' } });

  // ── 商品 ──
  const categoryA = await prisma.category.create({
    data: { brandId: brandA.id, name: '炸鸡系列', sortOrder: 1, path: '01' },
  });
  const spuA1 = await prisma.spu.create({
    data: { brandId: brandA.id, categoryId: categoryA.id, spuCode: 'WYZJ-SPU-001', name: '奥尔良鸡翅', unit: '袋', storageType: 'frozen', shelfLifeDays: 180 },
  });
  const skuA1 = await prisma.sku.create({
    data: { spuId: spuA1.id, brandId: brandA.id, skuCode: 'WYZJ-SKU-001', specDetail: '1kg/袋×10袋/箱', price: 5000, costPrice: 3500, minOrderQty: 1, stepOrderQty: 1 },
  });
  const skuA2 = await prisma.sku.create({
    data: { spuId: spuA1.id, brandId: brandA.id, skuCode: 'WYZJ-SKU-002', specDetail: '500g/袋×20袋/箱', price: 2800, costPrice: 1900, minOrderQty: 1, stepOrderQty: 1 },
  });

  const spuA2 = await prisma.spu.create({
    data: { brandId: brandA.id, categoryId: categoryA.id, spuCode: 'WYZJ-SPU-002', name: '香辣鸡腿肉', unit: '袋', storageType: 'frozen', shelfLifeDays: 180 },
  });
  await prisma.sku.create({
    data: { spuId: spuA2.id, brandId: brandA.id, skuCode: 'WYZJ-SKU-003', specDetail: '2kg/袋×8袋/箱', price: 8500, costPrice: 6000, minOrderQty: 1, stepOrderQty: 1 },
  });

  console.log('\n✅ Seed data created!');
  console.log('\nTest accounts:');
  console.log('  Admin (HQ):    admin / test123  → brand: WYZJ');
  console.log('  Store A1:      store01 / test123 → 北京朝阳店 余额:¥1,000');
  console.log('  Store A2:      store02 / test123 → 上海浦东店 余额:¥2,000');
  console.log('  Kitchen:       kitchen01 / test123 → CK');
  console.log('  Supplier:      supplier01 / test123 → 供应商');
  console.log('  Store B1:      storeb01 / test123 → brand: MMJD (cross-brand test)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
