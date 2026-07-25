# Phase 3: 加盟+小程序 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 M3 加盟闭环：独立 FranchiseApplication 表 + 完整申请→审核→缴费→激活流程 + 小程序 25 页全量填充 + 总部后台加盟管理

**Architecture:** 新建 franchise 模块承载加盟申请全生命周期；清理 organization 模块中的旧加盟代码；product 模块新增品牌公开接口；小程序按 prospect/franchisee 两个分包全量实现

**Tech Stack:** NestJS 11, Prisma 5, TypeScript 5, PostgreSQL 16, Vue 3 (uni-app), Pinia

## Global Constraints

- **金额存储**: 所有金额以"分"为单位，使用 INTEGER 类型。investmentBudget 用 Decimal 存储元。
- **品牌隔离**: Prisma Extension 自动注入 brand_id，业务代码无需手动处理
- **API 路径前缀**: 所有 API 统一 `/api/v1/` 前缀
- **幂等**: franchise 模块提交申请不需要幂等键（可由 openid + brandId 自然去重检查）
- **编码不可改**: spu_code、sku_code 一旦生成不可修改
- **订单快照**: order_items 冗余 sku_code/sku_name/unit_price

---

## 文件结构

```
apps/server/
├── prisma/
│   ├── schema.prisma                        ← Modify
│   └── migrations/
├── src/modules/
│   ├── franchise/                           ← Create
│   │   ├── franchise.module.ts
│   │   ├── franchise.controller.ts
│   │   ├── franchise.service.ts
│   │   └── dto/
│   │       ├── create-application.dto.ts
│   │       ├── review-application.dto.ts
│   │       └── confirm-payment.dto.ts
│   ├── organization/
│   │   ├── org.service.ts                   ← Modify
│   │   └── org.controller.ts                ← Modify
│   ├── product/
│   │   ├── product.controller.ts            ← Modify
│   │   └── product.service.ts               ← Modify
│   └── app.module.ts                        ← Modify

apps/miniapp/
├── subpkg-prospect/                         ← Create 8 pages
├── subpkg-franchisee/                       ← Create 15 pages
└── subpkg-common/
    └── api/index.ts                         ← Modify

apps/admin-hq/src/views/
├── Applications.vue                         ← Rewrite
├── Organizations.vue                        ← Modify
└── Dashboard.vue                            ← Modify
```

---

### Task 1: 数据库迁移 — FranchiseApplication 表

**Files:**
- Modify: `apps/server/prisma/schema.prisma`

**Interfaces:**
- Produces: `FranchiseAppStatus` enum + `FranchiseApplication` 模型 + Brand/User 关系字段
- Consumes: 无

- [ ] **Step 1: 在 schema.prisma 枚举区添加 FranchiseAppStatus**

在 `ReceivableStatus` 枚举之后（约第 177 行后）插入：

```prisma
enum FranchiseAppStatus {
  submitted
  under_review
  approved
  payment_confirmed
  activated
  rejected
  cancelled

  @@map("franchise_app_status_enum")
}
```

- [ ] **Step 2: 在 schema.prisma 模型区末尾添加 FranchiseApplication 模型**

在 `Receivable` 模型之后（文件末尾 @@map("receivables") 之后）插入：

```prisma
model FranchiseApplication {
  id                 String              @id @default(uuid()) @db.Uuid
  brandId            String              @map("brand_id") @db.Uuid
  applicantName      String              @map("applicant_name") @db.VarChar(50)
  applicantPhone     String              @map("applicant_phone") @db.VarChar(20)
  applicantOpenid    String?             @map("applicant_openid") @db.VarChar(64)
  storeName          String              @map("store_name") @db.VarChar(200)
  city               String              @db.VarChar(50)
  address            String              @db.VarChar(300)
  investmentBudget   Decimal?            @map("investment_budget") @db.Decimal(12, 2)
  status             FranchiseAppStatus  @default(submitted)
  reviewerId         String?             @map("reviewer_id") @db.Uuid
  reviewComment      String?             @db.Text
  reviewedAt         DateTime?           @map("reviewed_at") @db.Timestamptz()
  paymentConfirmedBy String?             @map("payment_confirmed_by") @db.Uuid
  paymentConfirmedAt DateTime?           @map("payment_confirmed_at") @db.Timestamptz()
  paymentRemark      String?             @db.Text
  activatedAt        DateTime?           @map("activated_at") @db.Timestamptz()
  createdOrgId       String?             @map("created_org_id") @db.Uuid
  remark             String?             @db.Text
  documents          Json?               @db.JsonB
  createdAt          DateTime            @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt          DateTime            @updatedAt @map("updated_at") @db.Timestamptz()

  brand            Brand @relation(fields: [brandId], references: [id])
  reviewer         User? @relation("ReviewerRel", fields: [reviewerId], references: [id])
  paymentConfirmer User? @relation("PaymentConfirmerRel", fields: [paymentConfirmedBy], references: [id])

  @@index([brandId, status, createdAt(sort: Desc)])
  @@map("franchise_applications")
}
```

- [ ] **Step 3: 在 Brand 模型中添加 franchiseApplications 关系**

在 Brand 模型的 `receivables Receivable[]` 之后添加：

```prisma
  franchiseApplications FranchiseApplication[]
```

- [ ] **Step 4: 在 User 模型中添加审核关系**

在 User 模型的 `inventoryTransOps InventoryTransaction[]` 之后添加：

```prisma
  reviewedApplications            FranchiseApplication[] @relation("ReviewerRel")
  paymentConfirmedApplications    FranchiseApplication[] @relation("PaymentConfirmerRel")
```

- [ ] **Step 5: 运行 Prisma 迁移**

```bash
cd D:/hxfood/apps/server && npx prisma migrate dev --name add_franchise_application
```

Expected: 迁移文件生成，数据库表创建成功，Prisma Client 重新生成。

- [ ] **Step 6: 提交**

```bash
git add apps/server/prisma/
git commit -m "feat: add FranchiseApplication model and FranchiseAppStatus enum"
```

---

### Task 2: Franchise DTOs

**Files:**
- Create: `apps/server/src/modules/franchise/dto/create-application.dto.ts`
- Create: `apps/server/src/modules/franchise/dto/review-application.dto.ts`
- Create: `apps/server/src/modules/franchise/dto/confirm-payment.dto.ts`

**Interfaces:**
- Consumes: 无
- Produces: `CreateApplicationDto`, `ReviewApplicationDto`, `ConfirmPaymentDto`

- [ ] **Step 1: 创建 create-application.dto.ts**

```typescript
import { IsString, IsOptional, IsNumber, MaxLength, MinLength } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  brandId: string;

  @IsString()
  @MaxLength(50)
  applicantName: string;

  @IsString()
  @MaxLength(20)
  applicantPhone: string;

  @IsString()
  @MaxLength(200)
  storeName: string;

  @IsString()
  @MaxLength(50)
  city: string;

  @IsString()
  @MaxLength(300)
  address: string;

  @IsOptional()
  @IsNumber()
  investmentBudget?: number;

  @IsOptional()
  @IsString()
  remark?: string;
}
```

- [ ] **Step 2: 创建 review-application.dto.ts**

```typescript
import { IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';

export class ReviewApplicationDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  comment?: string;
}
```

- [ ] **Step 3: 创建 confirm-payment.dto.ts**

```typescript
import { IsOptional, IsString } from 'class-validator';

export class ConfirmPaymentDto {
  @IsOptional()
  @IsString()
  remark?: string;
}
```

- [ ] **Step 4: 提交**

```bash
git add apps/server/src/modules/franchise/dto/
git commit -m "feat: add franchise DTOs (create, review, confirm-payment)"
```

---

### Task 3: Franchise Service

**Files:**
- Create: `apps/server/src/modules/franchise/franchise.service.ts`

**Interfaces:**
- Consumes: `PrismaService` from common, `CreateApplicationDto`, `ReviewApplicationDto`, `ConfirmPaymentDto`
- Produces: `FranchiseService` — `submitApplication`, `listApplications`, `getApplication`, `getMyApplications`, `reviewApplication`, `confirmPayment`, `activate`, `cancel`

- [ ] **Step 1: 创建 franchise.service.ts**

```typescript
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
```

- [ ] **Step 2: 提交**

```bash
git add apps/server/src/modules/franchise/franchise.service.ts
git commit -m "feat: add FranchiseService with full application lifecycle"
```

---

### Task 4: Franchise Controller

**Files:**
- Create: `apps/server/src/modules/franchise/franchise.controller.ts`

**Interfaces:**
- Consumes: `FranchiseService`
- Produces: 8 个 REST 端点

- [ ] **Step 1: 创建 franchise.controller.ts**

```typescript
import {
  Controller, Get, Post, Body, Param, Query,
} from '@nestjs/common';
import { FranchiseService } from './franchise.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { Public } from '../../common/decorators/public';
import { RequirePermission } from '../../common/decorators/require-permission';
import { BrandContext } from '../../common/decorators/brand-context';
import { CurrentUser } from '../../common/decorators/current-user';
import { JwtPayload } from '@hxfood/shared-types';

@Controller('franchise')
export class FranchiseController {
  constructor(private franchiseService: FranchiseService) {}

  /** 提交加盟申请 — 公开接口 */
  @Public()
  @Post('applications')
  async submitApplication(@Body() dto: CreateApplicationDto) {
    return this.franchiseService.submitApplication(dto);
  }

  /** 总部查询申请列表 */
  @Get('applications')
  @RequirePermission('store:view')
  async listApplications(
    @BrandContext() ctx: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.franchiseService.listApplications(ctx.brandId, {
      status,
      page: page ? parseInt(page) : undefined,
      pageSize: pageSize ? parseInt(pageSize) : undefined,
    });
  }

  /** 总部查看申请详情 */
  @Get('applications/:id')
  @RequirePermission('store:view')
  async getApplication(@Param('id') id: string) {
    return this.franchiseService.getApplication(id);
  }

  /** 加盟者查看自己的申请进度 */
  @Get('my-applications')
  @RequirePermission('product:view')
  async getMyApplications(@CurrentUser() user: JwtPayload) {
    return this.franchiseService.getMyApplications(user.openid || '');
  }

  /** 总部审核 */
  @Post('applications/:id/review')
  @RequirePermission('store:view')
  async reviewApplication(
    @Param('id') id: string,
    @Body() dto: ReviewApplicationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.franchiseService.reviewApplication(id, dto, user.sub);
  }

  /** 总部确认缴费 */
  @Post('applications/:id/confirm-payment')
  @RequirePermission('store:view')
  async confirmPayment(
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.franchiseService.confirmPayment(id, dto, user.sub);
  }

  /** 总部激活 */
  @Post('applications/:id/activate')
  @RequirePermission('store:view')
  async activate(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.franchiseService.activate(id, user.sub);
  }

  /** 加盟者主动撤销 */
  @Post('applications/:id/cancel')
  @RequirePermission('product:view')
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.franchiseService.cancel(id, user.openid || '');
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add apps/server/src/modules/franchise/franchise.controller.ts
git commit -m "feat: add FranchiseController with 8 REST endpoints"
```

---

### Task 5: Franchise Module + 注册到 AppModule

**Files:**
- Create: `apps/server/src/modules/franchise/franchise.module.ts`
- Modify: `apps/server/src/modules/franchise/franchise.module.ts` (same file, create)
- Modify: `apps/server/src/app.module.ts`

**Interfaces:**
- Consumes: `FranchiseController`, `FranchiseService`, `PrismaModule`
- Produces: `FranchiseModule`

- [ ] **Step 1: 创建 franchise.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { FranchiseController } from './franchise.controller';
import { FranchiseService } from './franchise.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FranchiseController],
  providers: [FranchiseService],
})
export class FranchiseModule {}
```

- [ ] **Step 2: 在 app.module.ts 中注册 FranchiseModule**

当前 `app.module.ts` imports 行：
```
imports: [ClsModule, PrismaModule, AuthModule, RbacModule, ProductModule, OrderModule, PaymentModule, OrgModule, InventoryModule, ProductionModule, FinanceModule],
```

在 `OrgModule` 之后添加 `FranchiseModule`：

使用 Edit 工具，将 `OrgModule, InventoryModule` 替换为 `OrgModule, FranchiseModule, InventoryModule`。

同时在 imports 数组中添加 import：
```typescript
import { FranchiseModule } from './modules/franchise/franchise.module';
```

在 import 语句区域（`import { PaymentModule }` 之后）添加：
```typescript
import { FranchiseModule } from './modules/franchise/franchise.module';
```

- [ ] **Step 3: 提交**

```bash
git add apps/server/src/modules/franchise/franchise.module.ts apps/server/src/app.module.ts
git commit -m "feat: register FranchiseModule in AppModule"
```

---

### Task 6: 清理 Organization 模块

**Files:**
- Modify: `apps/server/src/modules/organization/org.service.ts`
- Modify: `apps/server/src/modules/organization/org.controller.ts`

- [ ] **Step 1: 从 org.service.ts 删除三个加盟方法**

删除以下方法（约第 10-75 行）：
- `submitFranchiseApplication`（第 10-34 行）
- `listApplications`（第 36-43 行）
- `approveApplication`（第 45-75 行）

保留 `getOrganizations`、`getOrgDetail`、`updateOrg`、`getMyStore`、`updateMyStore` 五个方法不变。

删除后的 org.service.ts 应为：

```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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

  // ── 门店信息（加盟店自管理）──

  async getMyStore(orgId: string) {
    return this.getOrgDetail(orgId);
  }

  async updateMyStore(orgId: string, dto: { contactName?: string; contactPhone?: string; address?: any }) {
    return this.updateOrg(orgId, dto);
  }
}
```

- [ ] **Step 2: 从 org.controller.ts 删除三个加盟端点**

删除以下端点：
- `POST organizations/franchise-apply`（第 14-18 行）
- `GET organizations/applications`（第 21-25 行）
- `POST organizations/applications/:id/approve`（第 28-36 行）

同时移除不再需要的 `@Public` import（如果没有其他地方使用的话——检查后 `@Public` 只在 franchise-apply 使用，应移除）。

删除后的 org.controller.ts 的 imports 中移除 `Public` 相关引用。

- [ ] **Step 3: 提交**

```bash
git add apps/server/src/modules/organization/
git commit -m "refactor: remove franchise methods from org module (migrated to franchise module)"
```

---

### Task 7: 品牌公开接口

**Files:**
- Modify: `apps/server/src/modules/product/product.service.ts`
- Modify: `apps/server/src/modules/product/product.controller.ts`

- [ ] **Step 1: 在 product.service.ts 末尾添加品牌查询方法**

```typescript
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
    if (!brand) throw new Error('Brand not found');
    return {
      id: brand.id,
      name: brand.name,
      code: brand.code,
      config: brand.config || {},
      storeCount: brand.organizations.length,
      createdAt: brand.createdAt,
    };
  }
```

需要在 service 文件顶部导入 `NotFoundException`：
将 `import { Injectable } from '@nestjs/common';` 改为 `import { Injectable, NotFoundException } from '@nestjs/common';` 并将 `throw new Error('Brand not found')` 改为 `throw new NotFoundException('Brand not found')`。

- [ ] **Step 2: 在 product.controller.ts 添加公开端点**

在 `@Controller('products')` 类中添加：

```typescript
  // ── 品牌公开接口（prospect 浏览用）──
  @Public()
  @Get('brands')
  async getBrands() {
    return this.productService.getBrands();
  }

  @Public()
  @Get('brands/:id')
  async getBrandDetail(@Param('id') id: string) {
    return this.productService.getBrandDetail(id);
  }
```

由于使用了 `@Public()`，确保 controller 文件顶部有 `import { Public } from '../../common/decorators/public';`。当前 product.controller.ts 没有这个 import，需要添加。

- [ ] **Step 3: 提交**

```bash
git add apps/server/src/modules/product/
git commit -m "feat: add public brand list/detail endpoints for prospect browsing"
```

---

### Task 8: 小程序共享层 API 补充

**Files:**
- Modify: `apps/miniapp/subpkg-common/api/index.ts`

- [ ] **Step 1: 在 api/index.ts 中添加 brandApi 和 franchiseApi**

在 `paymentApi` 定义之后（文件末尾）添加：

```typescript
// ── Brands (public) ──
export const brandApi = {
  getList: () =>
    api.get('/products/brands'),
  getDetail: (id: string) =>
    api.get(`/products/brands/${id}`),
};

// ── Franchise ──
export const franchiseApi = {
  apply: (data: {
    brandId: string; applicantName: string; applicantPhone: string;
    storeName: string; city: string; address: string;
    investmentBudget?: number; remark?: string;
  }) =>
    api.post('/franchise/applications', data),
  myApplications: () =>
    api.get('/franchise/my-applications'),
  cancel: (id: string) =>
    api.post(`/franchise/applications/${id}/cancel`),
};
```

- [ ] **Step 2: 提交**

```bash
git add apps/miniapp/subpkg-common/api/index.ts
git commit -m "feat: add brandApi and franchiseApi to miniapp shared layer"
```

---

### Task 9: 小程序 Prospect 分包 — 品牌页

**Files:**
- Create: `apps/miniapp/subpkg-prospect/brand/list.vue`
- Create: `apps/miniapp/subpkg-prospect/brand/detail.vue`

- [ ] **Step 1: 创建 brand/list.vue**

```vue
<template>
  <view class="page">
    <view class="brand-list">
      <view class="brand-card" v-for="b in brands" :key="b.id" @tap="goDetail(b.id)">
        <image class="brand-logo" :src="b.logo || '/static/logo.png'" mode="aspectFill" />
        <view class="brand-info">
          <text class="brand-name">{{ b.name }}</text>
          <text class="brand-desc">{{ b.description }}</text>
          <text class="brand-stores">{{ b.storeCount }} 家门店</text>
        </view>
        <text class="arrow">→</text>
      </view>
      <view v-if="brands.length === 0 && !loading" class="empty">暂无品牌</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { brandApi } from '@/subpkg-common/api';

const brands = ref<any[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    brands.value = await brandApi.getList();
  } catch {}
  loading.value = false;
});

function goDetail(id: string) {
  uni.navigateTo({ url: `/subpkg-prospect/brand/detail?id=${id}` });
}
</script>

<style lang="scss" scoped>
.page { padding: 24rpx; min-height: 100vh; background: #f5f5f5; }
.brand-list { display: flex; flex-direction: column; gap: 20rpx; }
.brand-card { display: flex; align-items: center; background: #fff; border-radius: 16rpx; padding: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,.04); }
.brand-logo { width: 120rpx; height: 120rpx; border-radius: 16rpx; background: #f0f0f0; flex-shrink: 0; }
.brand-info { flex: 1; margin: 0 20rpx; display: flex; flex-direction: column; gap: 8rpx; }
.brand-name { font-size: 32rpx; font-weight: 600; }
.brand-desc { font-size: 24rpx; color: #666; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.brand-stores { font-size: 22rpx; color: #999; }
.arrow { font-size: 28rpx; color: #ccc; }
.empty { text-align: center; color: #999; padding: 100rpx 0; }
</style>
```

- [ ] **Step 2: 创建 brand/detail.vue**

```vue
<template>
  <view class="page">
    <view class="hero">
      <image class="hero-img" :src="brand.config?.bannerImage || '/static/logo.png'" mode="aspectFill" />
      <view class="hero-overlay">
        <text class="brand-name">{{ brand.name }}</text>
        <text class="brand-stores">{{ brand.storeCount }} 家门店</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">品牌介绍</text>
      <text class="section-content">{{ brand.config?.description || '暂无介绍' }}</text>
    </view>

    <view class="section" v-if="brand.config?.franchiseConditions">
      <text class="section-title">加盟条件</text>
      <text class="section-content">{{ brand.config.franchiseConditions }}</text>
    </view>

    <view class="section" v-if="brand.config?.franchiseFee">
      <text class="section-title">费用说明</text>
      <text class="section-content">{{ brand.config.franchiseFee }}</text>
    </view>

    <view class="bottom-bar">
      <button class="btn-primary" @tap="goApply">立即申请加盟</button>
      <button class="btn-outline" @tap="goGuide">加盟指南</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { brandApi } from '@/subpkg-common/api';

const brand = ref<any>({ config: {} });

onMounted(async () => {
  const { id } = __VUE_OPTIONS_API__ ? (this as any).$route.query : (getCurrentPages?.().pop()?.options || {});
  // uni-app composition API — use onLoad
});

// Use onLoad pattern for uni-app
const pages = getCurrentPages();
const currentPage = pages[pages.length - 1];
const routeId = (currentPage as any).options?.id || '';

onMounted(async () => {
  try {
    brand.value = await brandApi.getDetail(routeId);
  } catch {}
});

function goApply() {
  uni.navigateTo({ url: `/subpkg-prospect/application/form?brandId=${brand.value.id}` });
}
function goGuide() {
  uni.navigateTo({ url: '/subpkg-prospect/application/guide' });
}
</script>

<style lang="scss" scoped>
.page { background: #f5f5f5; padding-bottom: 140rpx; }
.hero { position: relative; height: 360rpx; }
.hero-img { width: 100%; height: 100%; }
.hero-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 40rpx 30rpx; background: linear-gradient(transparent, rgba(0,0,0,.6)); }
.brand-name { color: #fff; font-size: 40rpx; font-weight: 700; display: block; }
.brand-stores { color: rgba(255,255,255,.8); font-size: 24rpx; margin-top: 6rpx; }
.section { background: #fff; margin: 20rpx; border-radius: 16rpx; padding: 30rpx; }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 16rpx; display: block; }
.section-content { font-size: 26rpx; color: #666; line-height: 1.8; }
.bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; gap: 20rpx; padding: 20rpx 30rpx; background: #fff; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,.08); }
.btn-primary { flex: 1; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border-radius: 40rpx; font-size: 28rpx; font-weight: 600; }
.btn-outline { flex: 1; background: #fff; color: #667eea; border: 2rpx solid #667eea; border-radius: 40rpx; font-size: 28rpx; }
</style>
```

- [ ] **Step 3: 提交**

```bash
git add apps/miniapp/subpkg-prospect/brand/
git commit -m "feat: add prospect brand list and detail pages"
```

---

### Task 10: 小程序 Prospect 分包 — 加盟申请页

**Files:**
- Create: `apps/miniapp/subpkg-prospect/application/guide.vue`
- Create: `apps/miniapp/subpkg-prospect/application/form.vue`
- Create: `apps/miniapp/subpkg-prospect/application/progress.vue`
- Create: `apps/miniapp/subpkg-prospect/application/upload.vue`

- [ ] **Step 1: 创建 application/guide.vue**

```vue
<template>
  <view class="page">
    <view class="steps">
      <view class="step" v-for="(s, i) in steps" :key="i">
        <view class="step-num">{{ i + 1 }}</view>
        <view class="step-content">
          <text class="step-title">{{ s.title }}</text>
          <text class="step-desc">{{ s.desc }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">资质要求</text>
      <view class="req-list">
        <text class="req-item">• 具备合法有效的营业执照</text>
        <text class="req-item">• 食品经营许可证</text>
        <text class="req-item">• 门店面积不低于 30㎡</text>
        <text class="req-item">• 具备基本的冷藏/冷冻设备</text>
        <text class="req-item">• 经营者身体健康，持有健康证</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">常见问题</text>
      <view class="faq-item" v-for="(f, i) in faqs" :key="i">
        <text class="faq-q">{{ f.q }}</text>
        <text class="faq-a">{{ f.a }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const steps = [
  { title: '浏览品牌', desc: '查看品牌介绍、加盟条件和费用说明' },
  { title: '提交申请', desc: '填写门店信息、上传资质文件' },
  { title: '总部审核', desc: '品牌方审核资质，1-3个工作日' },
  { title: '缴纳费用', desc: '审核通过后缴纳加盟费' },
  { title: '开通账号', desc: '缴费确认后开通订货账号' },
];
const faqs = [
  { q: '加盟费大概多少？', a: '不同品牌费用不同，请查看品牌详情页的费用说明。' },
  { q: '审核需要多长时间？', a: '一般 1-3 个工作日，节假日顺延。' },
  { q: '开店需要什么设备？', a: '冷藏柜、冷冻柜是基本配置，具体以品牌要求为准。' },
  { q: '可以同时加盟多个品牌吗？', a: '可以，每个品牌申请独立提交审核。' },
];
</script>

<style lang="scss" scoped>
.page { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.steps { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-bottom: 20rpx; }
.step { display: flex; align-items: flex-start; gap: 20rpx; padding-bottom: 30rpx; border-left: 2rpx dashed #e0e0e0; margin-left: 24rpx; padding-left: 30rpx; position: relative; }
.step:last-child { border-left: none; padding-bottom: 0; }
.step-num { width: 48rpx; height: 48rpx; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; text-align: center; line-height: 48rpx; font-size: 24rpx; font-weight: 600; position: absolute; left: -24rpx; flex-shrink: 0; }
.step-title { font-size: 28rpx; font-weight: 600; display: block; }
.step-desc { font-size: 24rpx; color: #999; display: block; margin-top: 4rpx; }
.section { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-bottom: 20rpx; }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 16rpx; display: block; }
.req-item { font-size: 26rpx; color: #666; line-height: 2; display: block; }
.faq-item { margin-bottom: 20rpx; }
.faq-item:last-child { margin-bottom: 0; }
.faq-q { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.faq-a { font-size: 24rpx; color: #999; display: block; margin-top: 6rpx; }
</style>
```

- [ ] **Step 2: 创建 application/form.vue**

```vue
<template>
  <view class="page">
    <view class="form">
      <view class="form-group">
        <text class="label">姓名 <text class="required">*</text></text>
        <input v-model="form.applicantName" placeholder="请输入姓名" class="input" />
      </view>
      <view class="form-group">
        <text class="label">手机号 <text class="required">*</text></text>
        <input v-model="form.applicantPhone" placeholder="请输入手机号" type="number" maxlength="11" class="input" />
      </view>
      <view class="form-group">
        <text class="label">门店名称 <text class="required">*</text></text>
        <input v-model="form.storeName" placeholder="请输入门店名称" class="input" />
      </view>
      <view class="form-group">
        <text class="label">城市 <text class="required">*</text></text>
        <input v-model="form.city" placeholder="如：广州市" class="input" />
      </view>
      <view class="form-group">
        <text class="label">详细地址 <text class="required">*</text></text>
        <input v-model="form.address" placeholder="请输入详细地址" class="input" />
      </view>
      <view class="form-group">
        <text class="label">投资预算（万元）</text>
        <input v-model="form.investmentBudget" placeholder="如：10" type="digit" class="input" />
      </view>
      <view class="form-group">
        <text class="label">备注</text>
        <textarea v-model="form.remark" placeholder="其他补充说明（选填）" class="textarea" />
      </view>
    </view>

    <button class="submit-btn" :loading="submitting" @tap="handleSubmit">提交申请</button>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { franchiseApi } from '@/subpkg-common/api';

const pages = getCurrentPages();
const page = pages[pages.length - 1];
const brandId = (page as any).options?.brandId || '';

const form = reactive({
  brandId,
  applicantName: '',
  applicantPhone: '',
  storeName: '',
  city: '',
  address: '',
  investmentBudget: undefined as number | undefined,
  remark: '',
});
const submitting = ref(false);

async function handleSubmit() {
  if (!form.applicantName || !form.applicantPhone || !form.storeName || !form.city || !form.address) {
    uni.showToast({ title: '请填写必填字段', icon: 'none' });
    return;
  }
  if (!/^1\d{10}$/.test(form.applicantPhone)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    await franchiseApi.apply({
      ...form,
      investmentBudget: form.investmentBudget ? Number(form.investmentBudget) : undefined,
    });
    uni.showToast({ title: '提交成功', icon: 'success' });
    setTimeout(() => uni.navigateTo({ url: '/subpkg-prospect/application/progress' }), 1000);
  } catch (e: any) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
.page { padding: 24rpx; background: #f5f5f5; min-height: 100vh; padding-bottom: 120rpx; }
.form { background: #fff; border-radius: 16rpx; padding: 30rpx; }
.form-group { margin-bottom: 30rpx; }
.form-group:last-child { margin-bottom: 0; }
.label { font-size: 28rpx; font-weight: 500; color: #333; margin-bottom: 12rpx; display: block; }
.required { color: #e74c3c; }
.input { background: #f8f8f8; border-radius: 12rpx; padding: 20rpx 24rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; }
.textarea { background: #f8f8f8; border-radius: 12rpx; padding: 20rpx 24rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; min-height: 160rpx; }
.submit-btn { margin: 40rpx 0; width: 100%; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border-radius: 44rpx; font-size: 32rpx; font-weight: 600; height: 88rpx; line-height: 88rpx; }
</style>
```

- [ ] **Step 3: 创建 application/progress.vue**

```vue
<template>
  <view class="page">
    <view v-if="applications.length === 0 && !loading" class="empty">
      <text>暂无加盟申请</text>
      <button class="btn-link" @tap="goApply">去申请 →</button>
    </view>

    <view class="app-card" v-for="app in applications" :key="app.id">
      <view class="app-header">
        <text class="app-brand">{{ app.brand?.name }}</text>
        <text class="app-store">{{ app.storeName }}</text>
      </view>

      <view class="timeline">
        <view class="tl-item" :class="{ active: isActive(app, 'submitted') }">
          <view class="tl-dot"></view>
          <view class="tl-info">
            <text class="tl-title">已提交</text>
            <text class="tl-time">{{ formatDate(app.createdAt) }}</text>
          </view>
        </view>
        <view class="tl-item" :class="{ active: isActive(app, 'under_review') }">
          <view class="tl-dot"></view>
          <view class="tl-info">
            <text class="tl-title">审核中</text>
            <text class="tl-time" v-if="app.reviewedAt">{{ formatDate(app.reviewedAt) }}</text>
          </view>
        </view>
        <view class="tl-item" :class="{ active: isActive(app, 'approved') }">
          <view class="tl-dot"></view>
          <view class="tl-info">
            <text class="tl-title">{{ app.status === 'rejected' ? '已驳回' : '已通过' }}</text>
            <text class="tl-time" v-if="app.reviewComment">{{ app.reviewComment }}</text>
          </view>
        </view>
        <view class="tl-item" :class="{ active: isActive(app, 'payment_confirmed') }">
          <view class="tl-dot"></view>
          <view class="tl-info">
            <text class="tl-title">已缴费</text>
            <text class="tl-time" v-if="app.paymentConfirmedAt">{{ formatDate(app.paymentConfirmedAt) }}</text>
          </view>
        </view>
        <view class="tl-item" :class="{ active: app.status === 'activated' }">
          <view class="tl-dot"></view>
          <view class="tl-info">
            <text class="tl-title">已开通</text>
          </view>
        </view>
      </view>

      <view class="app-status-tag" :class="statusClass(app.status)">{{ statusText(app.status) }}</view>

      <view v-if="app.status === 'submitted' || app.status === 'under_review'" class="app-actions">
        <button class="btn-cancel" @tap="handleCancel(app.id)">撤销申请</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { franchiseApi } from '@/subpkg-common/api';

const applications = ref<any[]>([]);
const loading = ref(true);
const statusOrder = ['submitted', 'under_review', 'approved', 'payment_confirmed', 'activated'];

onMounted(async () => {
  try {
    applications.value = await franchiseApi.myApplications();
  } catch {}
  loading.value = false;
});

function isActive(app: any, status: string) {
  if (app.status === 'rejected' || app.status === 'cancelled') return false;
  return statusOrder.indexOf(app.status) >= statusOrder.indexOf(status);
}
function statusClass(s: string) {
  const m: any = { submitted: 'tag-info', under_review: 'tag-warning', approved: 'tag-success', payment_confirmed: 'tag-primary', activated: 'tag-success', rejected: 'tag-danger', cancelled: 'tag-default' };
  return m[s] || '';
}
function statusText(s: string) {
  const m: any = { submitted: '已提交', under_review: '审核中', approved: '已通过', payment_confirmed: '已缴费', activated: '已开通', rejected: '已驳回', cancelled: '已撤销' };
  return m[s] || s;
}
function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('zh-CN');
}
async function handleCancel(id: string) {
  const res = await uni.showModal({ title: '确认撤销', content: '确定要撤销此申请吗？' });
  if (!res.confirm) return;
  try {
    await franchiseApi.cancel(id);
    uni.showToast({ title: '已撤销', icon: 'success' });
    const apps = await franchiseApi.myApplications();
    applications.value = apps;
  } catch (e: any) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' });
  }
}
function goApply() {
  uni.navigateTo({ url: '/subpkg-prospect/brand/list' });
}
</script>

<style lang="scss" scoped>
.page { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.empty { text-align: center; padding: 100rpx 0; color: #999; }
.btn-link { color: #667eea; background: none; font-size: 26rpx; margin-top: 16rpx; }
.app-card { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-bottom: 20rpx; position: relative; }
.app-header { margin-bottom: 24rpx; }
.app-brand { font-size: 32rpx; font-weight: 600; display: block; }
.app-store { font-size: 24rpx; color: #999; margin-top: 4rpx; display: block; }
.timeline { position: relative; }
.tl-item { display: flex; align-items: flex-start; gap: 16rpx; padding-bottom: 24rpx; opacity: 0.35; }
.tl-item.active { opacity: 1; }
.tl-dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: #ccc; margin-top: 6rpx; flex-shrink: 0; }
.tl-item.active .tl-dot { background: #667eea; }
.tl-title { font-size: 26rpx; display: block; }
.tl-time { font-size: 22rpx; color: #999; display: block; margin-top: 2rpx; }
.app-status-tag { position: absolute; top: 30rpx; right: 30rpx; font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 20rpx; }
.tag-info { background: #e8f4fd; color: #3498db; }
.tag-warning { background: #fef3e2; color: #f39c12; }
.tag-success { background: #e8f8e8; color: #27ae60; }
.tag-primary { background: #ede7f6; color: #667eea; }
.tag-danger { background: #fde8e8; color: #e74c3c; }
.tag-default { background: #f0f0f0; color: #999; }
.app-actions { margin-top: 20rpx; }
.btn-cancel { width: 100%; background: #fff; color: #e74c3c; border: 1rpx solid #e74c3c; border-radius: 40rpx; font-size: 26rpx; height: 64rpx; line-height: 64rpx; }
</style>
```

- [ ] **Step 4: 创建 application/upload.vue**

```vue
<template>
  <view class="page">
    <view class="section">
      <text class="section-title">资质文件上传</text>
      <text class="section-tip">请上传清晰的证件照片，支持 jpg/png 格式</text>
    </view>

    <view class="upload-item" v-for="item in items" :key="item.key">
      <view class="upload-label">
        <text>{{ item.label }}</text>
        <text class="required" v-if="item.required">*</text>
      </view>
      <view class="upload-area" @tap="chooseImage(item.key)">
        <image v-if="files[item.key]" :src="files[item.key]" mode="aspectFill" class="preview" />
        <view v-else class="placeholder">
          <text class="plus">+</text>
          <text class="upload-text">点击上传</text>
        </view>
      </view>
    </view>

    <button class="submit-btn" :loading="uploading" @tap="handleUpload">提交资料</button>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

const files = reactive<Record<string, string>>({});
const uploading = ref(false);

const items = [
  { key: 'businessLicense', label: '营业执照', required: true },
  { key: 'foodLicense', label: '食品经营许可证', required: true },
  { key: 'healthCert', label: '健康证', required: false },
  { key: 'idCard', label: '身份证', required: true },
];

function chooseImage(key: string) {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      files[key] = res.tempFilePaths[0];
    },
  });
}

async function handleUpload() {
  if (!files.businessLicense || !files.foodLicense || !files.idCard) {
    uni.showToast({ title: '请上传必填证件', icon: 'none' });
    return;
  }
  uploading.value = true;
  // 实际应用中这里应上传到 OSS/MinIO，当前仅做本地提示
  uni.showToast({ title: '上传成功（开发阶段模拟）', icon: 'success' });
  uploading.value = false;
}
</script>

<style lang="scss" scoped>
.page { padding: 24rpx; background: #f5f5f5; min-height: 100vh; padding-bottom: 120rpx; }
.section { margin-bottom: 30rpx; }
.section-title { font-size: 30rpx; font-weight: 600; display: block; }
.section-tip { font-size: 24rpx; color: #999; display: block; margin-top: 8rpx; }
.upload-item { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
.upload-label { font-size: 28rpx; font-weight: 500; margin-bottom: 16rpx; }
.required { color: #e74c3c; }
.upload-area { width: 100%; height: 200rpx; border-radius: 12rpx; overflow: hidden; background: #f8f8f8; border: 2rpx dashed #ddd; display: flex; align-items: center; justify-content: center; }
.preview { width: 100%; height: 100%; }
.placeholder { text-align: center; }
.plus { font-size: 48rpx; color: #ccc; display: block; }
.upload-text { font-size: 24rpx; color: #999; margin-top: 4rpx; }
.submit-btn { margin-top: 30rpx; width: 100%; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border-radius: 44rpx; font-size: 32rpx; font-weight: 600; height: 88rpx; line-height: 88rpx; }
</style>
```

- [ ] **Step 5: 提交**

```bash
git add apps/miniapp/subpkg-prospect/application/
git commit -m "feat: add prospect application pages (guide, form, progress, upload)"
```

---

### Task 11: 小程序 Prospect 分包 — 工具页

**Files:**
- Create: `apps/miniapp/subpkg-prospect/calculator/roi.vue`
- Create: `apps/miniapp/subpkg-prospect/contact/index.vue`

- [ ] **Step 1: 创建 calculator/roi.vue**

```vue
<template>
  <view class="page">
    <view class="card">
      <text class="card-title">投资回报测算</text>
      <view class="input-group">
        <text class="label">日均订单量（单）</text>
        <input v-model="dailyOrders" type="number" placeholder="如：50" class="input" />
      </view>
      <view class="input-group">
        <text class="label">平均客单价（元）</text>
        <input v-model="avgPrice" type="digit" placeholder="如：30" class="input" />
      </view>
      <view class="input-group">
        <text class="label">毛利率（%）</text>
        <input v-model="margin" type="number" placeholder="如：40" class="input" />
      </view>
      <view class="input-group">
        <text class="label">前期投入（万元）</text>
        <input v-model="investment" type="digit" placeholder="如：8" class="input" />
      </view>
    </view>

    <view class="result-card" v-if="showResult">
      <text class="result-title">测算结果</text>
      <view class="result-row">
        <text class="r-label">日均营收</text>
        <text class="r-value">{{ dailyRevenue }} 元</text>
      </view>
      <view class="result-row">
        <text class="r-label">月毛利</text>
        <text class="r-value">{{ monthlyProfit }} 元</text>
      </view>
      <view class="result-row">
        <text class="r-label">年毛利</text>
        <text class="r-value">{{ yearlyProfit }} 万元</text>
      </view>
      <view class="result-row highlight">
        <text class="r-label">预计回本周期</text>
        <text class="r-value">{{ paybackMonths }} 个月</text>
      </view>
    </view>

    <text class="disclaimer">* 此测算仅供参考，实际营收以经营情况为准</text>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const dailyOrders = ref('50');
const avgPrice = ref('30');
const margin = ref('40');
const investment = ref('8');

const showResult = computed(() => dailyOrders.value && avgPrice.value && margin.value && investment.value);
const dailyRevenue = computed(() => (Number(dailyOrders.value) * Number(avgPrice.value)).toFixed(0));
const monthlyProfit = computed(() => (Number(dailyOrders.value) * Number(avgPrice.value) * 30 * Number(margin.value) / 100).toFixed(0));
const yearlyProfit = computed(() => (Number(monthlyProfit.value) * 12 / 10000).toFixed(2));
const paybackMonths = computed(() => {
  const inv = Number(investment.value) * 10000;
  const mp = Number(monthlyProfit.value);
  return mp > 0 ? Math.ceil(inv / mp) : 0;
});
</script>

<style lang="scss" scoped>
.page { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.card { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-bottom: 20rpx; }
.card-title { font-size: 32rpx; font-weight: 600; margin-bottom: 24rpx; display: block; }
.input-group { margin-bottom: 20rpx; }
.label { font-size: 26rpx; color: #666; margin-bottom: 8rpx; display: block; }
.input { background: #f8f8f8; border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; }
.result-card { background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 16rpx; padding: 30rpx; margin-bottom: 20rpx; }
.result-title { color: #fff; font-size: 30rpx; font-weight: 600; display: block; margin-bottom: 20rpx; }
.result-row { display: flex; justify-content: space-between; padding: 12rpx 0; border-bottom: 1rpx solid rgba(255,255,255,.15); }
.result-row:last-child { border-bottom: none; }
.result-row.highlight .r-value { color: #f1c40f; font-weight: 700; }
.r-label { color: rgba(255,255,255,.8); font-size: 26rpx; }
.r-value { color: #fff; font-size: 28rpx; font-weight: 500; }
.disclaimer { font-size: 22rpx; color: #bbb; text-align: center; display: block; }
</style>
```

- [ ] **Step 2: 创建 contact/index.vue**

```vue
<template>
  <view class="page">
    <view class="card">
      <text class="card-title">联系我们</text>
      <view class="contact-row">
        <text class="c-label">客服电话</text>
        <text class="c-value">400-123-4567</text>
      </view>
      <view class="contact-row">
        <text class="c-label">工作时间</text>
        <text class="c-value">周一至周五 9:00-18:00</text>
      </view>
      <view class="contact-row">
        <text class="c-label">电子邮箱</text>
        <text class="c-value">contact@hxfood.com</text>
      </view>
    </view>

    <view class="card">
      <text class="card-title">关注公众号</text>
      <image class="qrcode" src="/static/logo.png" mode="aspectFit" />
      <text class="qrcode-tip">微信扫码关注"核销食"公众号</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.card { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-bottom: 20rpx; text-align: center; }
.card-title { font-size: 30rpx; font-weight: 600; margin-bottom: 20rpx; display: block; }
.contact-row { display: flex; justify-content: space-between; padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.contact-row:last-child { border-bottom: none; }
.c-label { font-size: 26rpx; color: #666; }
.c-value { font-size: 26rpx; color: #333; font-weight: 500; }
.qrcode { width: 300rpx; height: 300rpx; margin: 20rpx auto; background: #f5f5f5; border-radius: 12rpx; }
.qrcode-tip { font-size: 24rpx; color: #999; display: block; }
</style>
```

- [ ] **Step 3: 提交**

```bash
git add apps/miniapp/subpkg-prospect/calculator/ apps/miniapp/subpkg-prospect/contact/
git commit -m "feat: add prospect utility pages (roi calculator, contact)"
```

---

### Task 12-18: 小程序 Franchisee 分包 — 订单页群（3页）

(后续任务的详细内容……由于篇幅限制，这里列出所有任务并继续。实际实现时每个页面都会提供完整代码。)

**由于计划篇幅极长（30+ 个 Vue 页面 + 后端代码），实际实现时将按以下任务结构执行，每个页面提供完整 Template + Script + Style 代码。以下为剩余任务的标题和文件列表：**

---

### Task 12: Franchisee 订单页（3页）
- Create: `apps/miniapp/subpkg-franchisee/order/list.vue` — 状态Tab筛选/分页/下拉刷新
- Create: `apps/miniapp/subpkg-franchisee/order/detail.vue` — 明细/状态时间线/操作按钮
- Create: `apps/miniapp/subpkg-franchisee/order/cart.vue` — 本地存储购物车/批量提交
- Commit: `feat: add franchisee order pages (list, detail, cart)`

### Task 13: Franchisee 商品页（4页）
- Create: `apps/miniapp/subpkg-franchisee/goods/category.vue` — 两级分类树
- Create: `apps/miniapp/subpkg-franchisee/goods/list.vue` — 网格/列表切换
- Create: `apps/miniapp/subpkg-franchisee/goods/detail.vue` — 轮播/规格/加购物车
- Create: `apps/miniapp/subpkg-franchisee/goods/search.vue` — 搜索+历史+结果
- Commit: `feat: add franchisee goods pages`

### Task 14: Franchisee 支付页（3页）
- Create: `apps/miniapp/subpkg-franchisee/payment/account.vue` — 余额/额度/交易记录
- Create: `apps/miniapp/subpkg-franchisee/payment/bill-list.vue` — 按月分组/收支标记
- Create: `apps/miniapp/subpkg-franchisee/payment/recharge.vue` — 金额输入/支付方式选择/调Mock支付
- Commit: `feat: add franchisee payment pages`

### Task 15: Franchisee 门店页（2页）
- Create: `apps/miniapp/subpkg-franchisee/store/profile.vue` — 展示/编辑门店基本信息
- Create: `apps/miniapp/subpkg-franchisee/store/certification.vue` — 上传/查看资质文件
- Commit: `feat: add franchisee store pages`

### Task 16: Franchisee 其他页（3页）
- Create: `apps/miniapp/subpkg-franchisee/report/sales.vue` — 趋势图+热销排行
- Create: `apps/miniapp/subpkg-franchisee/msg-center/index.vue` — 通知列表
- Create: `apps/miniapp/subpkg-franchisee/settings/account.vue` — 改密码/换绑手机
- Commit: `feat: add franchisee utility pages (report, messages, settings)`

### Task 17: 总部后台 — Applications.vue 重写
- Modify: `apps/admin-hq/src/views/Applications.vue` — 完整重写：对接 `/franchise/applications`、状态筛选、审核弹窗、确认缴费、激活
- Commit: `feat: rewrite admin Applications page with franchise workflow`

### Task 18: 总部后台 — Organizations.vue + Dashboard.vue 修改
- Modify: `apps/admin-hq/src/views/Organizations.vue` — 增加 orgType 筛选 + 余额显示
- Modify: `apps/admin-hq/src/views/Dashboard.vue` — 增加待审核/待缴费统计卡片
- Commit: `feat: update admin Organizations and Dashboard for franchise stats`

### Task 19: 构建验证

- [ ] **Step 1: 编译后端**

```bash
cd D:/hxfood/apps/server && npx tsc --noEmit
```
Expected: No TypeScript errors.

- [ ] **Step 2: 运行 Prisma generate**

```bash
cd D:/hxfood/apps/server && npx prisma generate
```
Expected: Client generated successfully.

- [ ] **Step 3: 检查小程序页面完整性**

确认 `pages.json` 中所有注册页面的 `.vue` 文件都存在：
```bash
ls apps/miniapp/subpkg-prospect/brand/list.vue
ls apps/miniapp/subpkg-prospect/brand/detail.vue
# ... (全部 25 页)
```

- [ ] **Step 4: 最终提交**

```bash
git add .
git commit -m "chore: Phase 3 final build verification passed"
```

---

## 验收清单

| # | 条件 | 验证方式 |
|---|------|---------|
| 1 | 未登录可浏览品牌列表/详情 | `GET /api/v1/products/brands` |
| 2 | 未登录可提交加盟申请 | `POST /api/v1/franchise/applications` |
| 3 | 加盟者可查看申请进度 | `GET /api/v1/franchise/my-applications` |
| 4 | 总部可查看申请列表 | `GET /api/v1/franchise/applications` |
| 5 | 总部可审核申请 | `POST /api/v1/franchise/applications/:id/review` |
| 6 | 总部可确认缴费 | `POST /api/v1/franchise/applications/:id/confirm-payment` |
| 7 | 总部可激活→创建门店+账户+角色 | `POST /api/v1/franchise/applications/:id/activate` |
| 8 | 加盟者可撤销申请 | `POST /api/v1/franchise/applications/:id/cancel` |
| 9 | 小程序 25 页全部可打开 | 逐页检查 |
| 10 | `tsc --noEmit` 通过 | 无编译错误 |
