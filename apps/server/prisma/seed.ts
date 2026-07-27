import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  const now = new Date();

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
  await prisma.storeAccount.create({
    data: { brandId: brandA.id, storeId: storeA1.id, balance: 100000, availableBalance: 100000, creditLimit: 50000 },
  });
  await prisma.storeAccount.create({
    data: { brandId: brandA.id, storeId: storeA2.id, balance: 200000, availableBalance: 200000, creditLimit: 100000 },
  });
  await prisma.storeAccount.create({
    data: { brandId: brandB.id, storeId: storeB1.id, balance: 150000, availableBalance: 150000, creditLimit: 80000 },
  });

  // ── 仓库 ──
  const whFinished = await prisma.warehouse.create({
    data: { brandId: brandA.id, orgId: ckA.id, warehouseType: 'finished', name: '味优成品库' },
  });
  await prisma.warehouse.create({
    data: { brandId: brandA.id, orgId: ckA.id, warehouseType: 'raw_material', name: '味优原料库' },
  });

  // ── 商品 ──
  const categoryA = await prisma.category.create({
    data: { brandId: brandA.id, name: '炸鸡系列', sortOrder: 1 },
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
  const skuA3 = await prisma.sku.create({
    data: { spuId: spuA2.id, brandId: brandA.id, skuCode: 'WYZJ-SKU-003', specDetail: '2kg/袋×8袋/箱', price: 8500, costPrice: 6000, minOrderQty: 1, stepOrderQty: 1 },
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  库存数据 (inventory + transactions)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('  Seeding inventory...');

  const invData = [
    { sku: skuA1, lotNo: 'LOT20260101', qty: 500, producedAt: '2026-01-01', expiryAt: '2027-01-01' },
    { sku: skuA1, lotNo: 'LOT20260115', qty: 300, producedAt: '2026-01-15', expiryAt: '2027-01-15' },
    { sku: skuA2, lotNo: 'LOT20260201', qty: 400, producedAt: '2026-02-01', expiryAt: '2027-02-01' },
    { sku: skuA3, lotNo: 'LOT20260215', qty: 200, producedAt: '2026-02-15', expiryAt: '2027-02-15' },
    { sku: skuA3, lotNo: 'LOT20260301', qty: 350, producedAt: '2026-03-01', expiryAt: '2027-03-01' },
  ];

  for (const inv of invData) {
    await prisma.inventory.create({
      data: {
        brandId: brandA.id,
        warehouseId: whFinished.id,
        skuId: inv.sku.id,
        lotNo: inv.lotNo,
        quantity: inv.qty,
        lockedQty: 0,
        availableQty: inv.qty,
        unit: '袋',
        producedAt: new Date(inv.producedAt),
        expiryAt: new Date(inv.expiryAt),
        status: 'normal',
      },
    });

    await prisma.inventoryTransaction.create({
      data: {
        brandId: brandA.id,
        warehouseId: whFinished.id,
        skuId: inv.sku.id,
        lotNo: inv.lotNo,
        transType: 'initial',
        quantity: inv.qty,
        balanceAfter: inv.qty,
        bizType: 'seed',
        operatorId: adminUser.id,
        remark: `初始库存导入 ${inv.lotNo}`,
      },
    });
  }

  console.log(`    Created ${invData.length} inventory records + transactions.`);

  // ═══════════════════════════════════════════════════════════════════════
  //  加盟申请 (franchise applications)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('  Seeding franchise applications...');

  // 1. submitted — 刚提交
  await prisma.franchiseApplication.create({
    data: {
      brandId: brandA.id,
      applicantName: '张三',
      applicantPhone: '13900000101',
      storeName: '味优炸鸡-成都武侯店',
      city: '成都',
      address: '四川省成都市武侯区天府大道100号',
      investmentBudget: 300000.00,
      status: 'submitted',
      remark: '自有商铺，面积约80平，附近有大型写字楼和居民区',
      documents: {
        idCardFront: 'https://example.com/docs/idcard_front_zhang.jpg',
        businessLicense: null,
        propertyProof: 'https://example.com/docs/property_zhang.pdf',
      },
    },
  });

  // 2. under_review — 审核中
  await prisma.franchiseApplication.create({
    data: {
      brandId: brandA.id,
      applicantName: '李四',
      applicantPhone: '13900000202',
      storeName: '味优炸鸡-深圳南山店',
      city: '深圳',
      address: '广东省深圳市南山区科技园路200号',
      investmentBudget: 500000.00,
      status: 'under_review',
      reviewerId: adminUser.id,
      remark: '商圈位置优越，周边有多个科技园区',
      reviewedAt: new Date('2026-07-20'),
      documents: {
        idCardFront: 'https://example.com/docs/idcard_front_li.jpg',
        businessLicense: null,
        propertyProof: null,
      },
    },
  });

  // 3. approved — 已通过
  await prisma.franchiseApplication.create({
    data: {
      brandId: brandA.id,
      applicantName: '王五',
      applicantPhone: '13900000303',
      storeName: '味优炸鸡-杭州西湖店',
      city: '杭州',
      address: '浙江省杭州市西湖区文三路300号',
      investmentBudget: 400000.00,
      status: 'approved',
      reviewerId: adminUser.id,
      reviewComment: '资质齐全，地理位置优越，建议批准。请尽快缴纳加盟费。',
      reviewedAt: new Date('2026-07-18'),
      remark: '已通过电话沟通，申请人有餐饮行业经验',
      documents: {
        idCardFront: 'https://example.com/docs/idcard_front_wang.jpg',
        businessLicense: null,
        propertyProof: 'https://example.com/docs/property_wang.pdf',
      },
    },
  });

  console.log('    Created 3 franchise applications (submitted, under_review, approved).');

  // ═══════════════════════════════════════════════════════════════════════
  //  示例订单 (sample orders)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('  Seeding sample orders...');

  // Order 1: approved — 已审核，待生产
  const order1 = await prisma.order.create({
    data: {
      brandId: brandA.id,
      orderNo: 'O20260725001',
      storeId: storeA1.id,
      orderType: 'sale',
      orderStatus: 'approved',
      totalAmount: 128000, // 20*5000 + 10*2800
      paymentMethod: 'balance',
      createdBy: storeUser.id,
      submittedAt: new Date('2026-07-25T08:00:00Z'),
      approvedAt: new Date('2026-07-25T09:00:00Z'),
      expectedAt: new Date('2026-07-28'),
      notes: '首批备货订单',
    },
  });

  // Order 1 items
  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      brandId: brandA.id,
      skuId: skuA1.id,
      skuCode: skuA1.skuCode,
      skuName: spuA1.name + ' ' + skuA1.specDetail,
      unitPrice: skuA1.price,
      quantity: 20,
      amount: 100000,
      status: 'normal',
    },
  });
  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      brandId: brandA.id,
      skuId: skuA2.id,
      skuCode: skuA2.skuCode,
      skuName: spuA1.name + ' ' + skuA2.specDetail,
      unitPrice: skuA2.price,
      quantity: 10,
      amount: 28000,
      status: 'normal',
    },
  });

  // Order status log for order 1
  await prisma.orderStatusLog.create({
    data: { orderId: order1.id, brandId: brandA.id, fromStatus: 'draft', toStatus: 'pending_approval', operatorId: storeUser.id, createdAt: new Date('2026-07-25T08:00:00Z') },
  });
  await prisma.orderStatusLog.create({
    data: { orderId: order1.id, brandId: brandA.id, fromStatus: 'pending_approval', toStatus: 'approved', operatorId: adminUser.id, createdAt: new Date('2026-07-25T09:00:00Z') },
  });

  // Order 2: produced — 已生产，待发货
  const order2 = await prisma.order.create({
    data: {
      brandId: brandA.id,
      orderNo: 'O20260725002',
      storeId: storeA1.id,
      orderType: 'sale',
      orderStatus: 'produced',
      totalAmount: 127500, // 15*8500
      paymentMethod: 'balance',
      createdBy: storeUser.id,
      submittedAt: new Date('2026-07-25T08:30:00Z'),
      approvedAt: new Date('2026-07-25T09:30:00Z'),
      producedAt: new Date('2026-07-25T14:00:00Z'),
      expectedAt: new Date('2026-07-29'),
      notes: '周末备货',
    },
  });

  // Order 2 items
  await prisma.orderItem.create({
    data: {
      orderId: order2.id,
      brandId: brandA.id,
      skuId: skuA3.id,
      skuCode: skuA3.skuCode,
      skuName: spuA2.name + ' ' + skuA3.specDetail,
      unitPrice: skuA3.price,
      quantity: 15,
      amount: 127500,
      status: 'normal',
    },
  });

  // Order status log for order 2
  await prisma.orderStatusLog.create({
    data: { orderId: order2.id, brandId: brandA.id, fromStatus: 'draft', toStatus: 'pending_approval', operatorId: storeUser.id, createdAt: new Date('2026-07-25T08:30:00Z') },
  });
  await prisma.orderStatusLog.create({
    data: { orderId: order2.id, brandId: brandA.id, fromStatus: 'pending_approval', toStatus: 'approved', operatorId: adminUser.id, createdAt: new Date('2026-07-25T09:30:00Z') },
  });
  await prisma.orderStatusLog.create({
    data: { orderId: order2.id, brandId: brandA.id, fromStatus: 'approved', toStatus: 'pending_production', operatorId: ckUser.id, createdAt: new Date('2026-07-25T10:00:00Z') },
  });
  await prisma.orderStatusLog.create({
    data: { orderId: order2.id, brandId: brandA.id, fromStatus: 'pending_production', toStatus: 'in_production', operatorId: ckUser.id, createdAt: new Date('2026-07-25T11:00:00Z') },
  });
  await prisma.orderStatusLog.create({
    data: { orderId: order2.id, brandId: brandA.id, fromStatus: 'in_production', toStatus: 'produced', operatorId: ckUser.id, createdAt: new Date('2026-07-25T14:00:00Z') },
  });

  console.log('    Created 2 sample orders with items + status logs.');

  // ═══════════════════════════════════════════════════════════════════════
  //  账户交易流水 (account transactions for storeA1)
  // ═══════════════════════════════════════════════════════════════════════
  console.log('  Seeding account transactions...');

  await prisma.accountTransaction.create({
    data: {
      brandId: brandA.id,
      storeId: storeA1.id,
      transType: 'recharge',
      amount: 50000,
      balanceAfter: 150000,
      bizNo: 'R20260710001',
      remark: '在线充值 ¥500.00',
      createdAt: new Date('2026-07-10T10:00:00Z'),
    },
  });

  await prisma.accountTransaction.create({
    data: {
      brandId: brandA.id,
      storeId: storeA1.id,
      transType: 'recharge',
      amount: 30000,
      balanceAfter: 180000,
      bizNo: 'R20260718001',
      remark: '在线充值 ¥300.00',
      createdAt: new Date('2026-07-18T14:00:00Z'),
    },
  });

  // order payment for order 2 (which is produced — mock payment deduction)
  await prisma.accountTransaction.create({
    data: {
      brandId: brandA.id,
      storeId: storeA1.id,
      orderId: order2.id,
      transType: 'order_pay',
      amount: -order2.totalAmount,
      balanceAfter: 180000 - order2.totalAmount,
      bizNo: order2.orderNo,
      remark: `订单扣款 ${order2.orderNo} ¥${(order2.totalAmount / 100).toFixed(2)}`,
      createdAt: new Date('2026-07-25T15:00:00Z'),
    },
  });

  // Update storeA1 account balance to reflect transactions
  await prisma.storeAccount.update({
    where: { storeId: storeA1.id },
    data: { balance: 180000 - order2.totalAmount, availableBalance: 180000 - order2.totalAmount },
  });

  console.log('    Created 3 account transactions for storeA1.');

  // ═══════════════════════════════════════════════════════════════════════
  //  输出汇总
  // ═══════════════════════════════════════════════════════════════════════
  const divider = '──────────────────────────────────────────────────────────────';
  console.log(`\n${divider}`);
  console.log('  🍗  hxfood Seed Complete!');
  console.log(divider);

  console.log('\n📋 Brands & Organizations');
  console.log(`  WYZJ (味优炸鸡): HQ=${hqA.id.substring(0, 8)}... CK=${ckA.id.substring(0, 8)}...`);
  console.log(`    Stores: WYZJ-001 (北京朝阳) | WYZJ-002 (上海浦东)`);
  console.log(`    Supplier: WYZJ-SUP01 (泰森)`);
  console.log(`  MMJD (面面聚道): Store MMJD-001 (广州天河)`);

  console.log('\n🧑 Test Accounts (all passwords: test123)');
  console.log(`  ┌──────────────┬──────────────────┬──────────────────────────┬─────────────────────┐`);
  console.log(`  │ username     │ realName         │ role                     │ org                 │`);
  console.log(`  ├──────────────┼──────────────────┼──────────────────────────┼─────────────────────┤`);
  console.log(`  │ admin        │ 系统管理员       │ super_admin (all perms)  │ WYZJ-HQ             │`);
  console.log(`  │ store01      │ 北京朝阳店长     │ store_admin              │ WYZJ-001 (北京朝阳)  │`);
  console.log(`  │ store02      │ 上海浦东店长     │ store_admin              │ WYZJ-002 (上海浦东)  │`);
  console.log(`  │ kitchen01    │ 中央厨房管理员   │ ck_admin                 │ WYZJ-CK             │`);
  console.log(`  │ supplier01   │ 供应商联系人     │ supplier                 │ WYZJ-SUP01          │`);
  console.log(`  │ storeb01     │ 广州天河店长     │ store_admin              │ MMJD-001 (广州天河)  │`);
  console.log(`  └──────────────┴──────────────────┴──────────────────────────┴─────────────────────┘`);

  console.log('\n💰 Store Accounts');
  console.log(`  WYZJ-001: 余额=¥${((180000 - order2.totalAmount) / 100).toFixed(2)} (原始 ¥1,000 + 充值 ¥800 - 订单 ¥${(order2.totalAmount / 100).toFixed(2)})`);
  console.log(`  WYZJ-002: 余额=¥2,000.00  信用额度=¥1,000`);
  console.log(`  MMJD-001: 余额=¥1,500.00  信用额度=¥800`);

  console.log('\n📦 Inventory (CK 成品库)');
  for (const inv of invData) {
    console.log(`  ${inv.sku.skuCode} | lot=${inv.lotNo} | qty=${inv.qty} | expiry=${inv.expiryAt}`);
  }

  console.log('\n📝 Franchise Applications');
  console.log(`  1. submitted:     张三 → 成都武侯店  ¥300,000`);
  console.log(`  2. under_review:  李四 → 深圳南山店  ¥500,000 (reviewer: admin)`);
  console.log(`  3. approved:      王五 → 杭州西湖店  ¥400,000 (reviewer: admin)`);

  console.log('\n📋 Sample Orders');
  console.log(`  1. ${order1.orderNo} | approved  | 北京朝阳 | ¥1,280.00 | 2 items`);
  console.log(`  2. ${order2.orderNo} | produced  | 北京朝阳 | ¥1,275.00 | 1 item (paid)`);

  console.log('\n🧾 Account Transactions (storeA1)');
  console.log(`  R20260710001 | recharge  | +¥500.00 | balance ¥1,500.00`);
  console.log(`  R20260718001 | recharge  | +¥300.00 | balance ¥1,800.00`);
  console.log(`  ${order2.orderNo} | order_pay | -¥${(order2.totalAmount / 100).toFixed(2)} | balance ¥${((180000 - order2.totalAmount) / 100).toFixed(2)}`);

  console.log(`\n${divider}`);
  console.log('🚀 Quickstart');
  console.log(divider);
  console.log('  # Start dev server');
  console.log('  pnpm run dev');
  console.log('');
  console.log('  # Open Prisma Studio');
  console.log('  cd apps/server && npx prisma studio');
  console.log('');
  console.log('  # Full DB reset (from root)');
  console.log('  pnpm run db:reset');
  console.log('');
  console.log('  # Re-seed only');
  console.log('  cd apps/server && npx ts-node prisma/seed.ts');
  console.log('');
  console.log('  # Run dev setup script (Unix)');
  console.log('  bash apps/server/scripts/dev-setup.sh');
  console.log('');
  console.log('  # Run dev setup script (Windows)');
  console.log('  .\\apps\\server\\scripts\\dev-setup.ps1');
  console.log(`${divider}\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
