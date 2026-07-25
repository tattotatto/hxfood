# Phase 3: 加盟+小程序 — 系统设计文档

> **项目名称**: 核销食（hxfood）连锁餐饮管理系统
> **文档版本**: v1.0
> **创建日期**: 2026-07-25
> **依赖**: Phase 1（基础设施）、Phase 2（订货闭环）
> **目标里程碑**: M3 — 加盟闭环（申请→审核→缴费→开通账号 E2E 通过）

---

## 目录

1. [设计决策](#1-设计决策)
2. [数据库设计](#2-数据库设计)
3. [加盟申请状态机](#3-加盟申请状态机)
4. [后端 API 设计](#4-后端-api-设计)
5. [小程序前端设计](#5-小程序前端设计)
6. [总部后台改动](#6-总部后台改动)
7. [文件变更汇总](#7-文件变更汇总)
8. [验收标准](#8-验收标准)

---

## 1. 设计决策

| 决策点 | 选择 | 说明 |
|--------|------|------|
| **加盟数据存储** | 独立 `FranchiseApplication` 表 | 申请有独立生命周期，与 Organization 解耦 |
| **小程序范围** | 全量 25 页 | prospect 8 页 + franchisee 17 页（含已实现的 2 页） |
| **缴费环节** | 总部手动确认 | 审核通过后由总部管理员点击"确认缴费"，不接真实支付 |
| **品牌浏览** | 新增公开 API | 潜在加盟者无需登录即可浏览品牌列表和详情 |

---

## 2. 数据库设计

### 2.1 新枚举：FranchiseAppStatus

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

### 2.2 新表：FranchiseApplication

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

### 2.3 Brand 模型新增关系

```prisma
model Brand {
  // ... existing fields ...
  franchiseApplications FranchiseApplication[]
}
```

### 2.4 User 模型新增关系

```prisma
model User {
  // ... existing fields ...
  reviewedApplications    FranchiseApplication[] @relation("ReviewerRel")
  paymentConfirmedApplications FranchiseApplication[] @relation("PaymentConfirmerRel")
}
```

---

## 3. 加盟申请状态机

### 3.1 状态流转图

```
                      ┌──────────┐
                      │ submitted │  ← 潜在加盟者提交（@Public）
                      └────┬─────┘
                           │ 总部点击"开始审核"
                      ┌────▼────────┐
                 ┌────│ under_review │
                 │    └────┬────────┘
                 │         │
            ┌────▼──┐  ┌──▼──────┐
            │ rejected │  │ approved │  ← 总部审核通过，待缴费
            └─────────┘  └──┬──────┘
                            │ 总部确认缴费
                       ┌────▼──────────┐
                       │ payment_confirmed │
                       └────┬──────────┘
                            │ 总部激活（创建 Org + 账户 + 角色）
                       ┌────▼────┐
                       │ activated │  ← 终端状态
                       └─────────┘

  任一步可取消: submitted/under_review → cancelled（加盟者主动取消）
```

### 3.2 转换规则

| 从 | 到 | 操作者 | 前置条件 |
|----|-----|--------|---------|
| `submitted` | `under_review` | 总部管理员 | — |
| `submitted` | `cancelled` | 申请者本人 | — |
| `under_review` | `approved` | 总部管理员 | reviewComment 可选 |
| `under_review` | `rejected` | 总部管理员 | reviewComment 必填 |
| `under_review` | `cancelled` | 申请者本人 | — |
| `approved` | `payment_confirmed` | 总部管理员 | — |
| `payment_confirmed` | `activated` | 总部管理员 | createdOrgId 为空 |

### 3.3 终端状态

`rejected`、`cancelled`、`activated` 为终端状态，不可再转换。

---

## 4. 后端 API 设计

### 4.1 新模块：franchise

**文件结构：**

```
apps/server/src/modules/franchise/
├── franchise.module.ts
├── franchise.controller.ts
├── franchise.service.ts
└── dto/
    ├── create-application.dto.ts
    ├── review-application.dto.ts
    └── confirm-payment.dto.ts
```

### 4.2 API 端点

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| `POST` | `/franchise/applications` | `@Public()` | 潜在加盟者提交申请 |
| `GET` | `/franchise/applications` | `store:view` | 总部查询申请列表 |
| `GET` | `/franchise/applications/:id` | `store:view` | 总部查看申请详情 |
| `GET` | `/franchise/my-applications` | 已登录 | 加盟者查看自己的申请进度 |
| `POST` | `/franchise/applications/:id/review` | `store:view` | 总部审核（通过/驳回） |
| `POST` | `/franchise/applications/:id/confirm-payment` | `store:view` | 总部确认缴费 |
| `POST` | `/franchise/applications/:id/activate` | `store:view` | 总部激活（创建Org+账户+角色） |
| `POST` | `/franchise/applications/:id/cancel` | 申请者本人 | 加盟者主动撤销 |

### 4.3 DTO 定义

```typescript
// create-application.dto.ts
class CreateApplicationDto {
  brandId: string;
  applicantName: string;
  applicantPhone: string;
  storeName: string;
  city: string;
  address: string;
  investmentBudget?: number;
  remark?: string;
}

// review-application.dto.ts
class ReviewApplicationDto {
  approved: boolean;       // true=通过, false=驳回
  comment?: string;        // 审核意见（驳回时必填）
}

// confirm-payment.dto.ts
class ConfirmPaymentDto {
  remark?: string;         // 支付备注（转账单号等）
}
```

### 4.4 activate 事务逻辑

```typescript
async activate(id: string, operatorId: string, brandId: string) {
  return this.prisma.$transaction(async (tx) => {
    const app = await tx.franchiseApplication.findUniqueOrThrow({
      where: { id, status: 'payment_confirmed' },
    });

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

    // 3. 如果申请者有 openid，关联用户到门店角色
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

    // 4. 更新申请状态
    await tx.franchiseApplication.update({
      where: { id },
      data: {
        status: 'activated',
        createdOrgId: org.id,
        activatedAt: new Date(),
      },
    });

    return org;
  });
}
```

### 4.5 organization 模块清理

删除以下已迁移到 franchise 模块的方法：
- `submitFranchiseApplication`
- `listApplications`
- `approveApplication`

保留通用组织管理方法不变。

### 4.6 品牌公开接口（product 模块新增）

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| `GET` | `/products/brands` | `@Public()` | 品牌列表（logo/名称/简介/门店数） |
| `GET` | `/products/brands/:id` | `@Public()` | 品牌详情（含加盟条件/费用说明/门店实景） |

---

## 5. 小程序前端设计

### 5.1 subpkg-prospect（8 页，全部新建）

| 页面 | 路径 | 核心元素 |
|------|------|---------|
| **品牌列表** | `brand/list` | 品牌卡片（logo/名称/简介/门店数）、下拉刷新 |
| **品牌详情** | `brand/detail` | 品牌介绍、加盟条件、费用、"立即申请"按钮 |
| **加盟指南** | `application/guide` | 步骤图、资质要求、FAQ |
| **加盟申请** | `application/form` | 表单（姓名/手机/店名/城市/地址/预算/备注） |
| **申请进度** | `application/progress` | 时间轴展示审核状态流转 |
| **资料上传** | `application/upload` | 图片上传（营业执照/身份证/健康证） |
| **投资测算** | `calculator/roi` | 日均单量×客单价→月营收→回本周期 |
| **联系我们** | `contact/index` | 客服电话、公众号二维码 |

### 5.2 subpkg-franchisee（15 页待建，2 页已建）

| 页面 | 路径 | 核心元素 | 状态 |
|------|------|---------|------|
| 工作台 | `dashboard/index` | 今日数据/快捷操作/近期订单 | ✅ 已实现 |
| 订货下单 | `order/create` | 商品选择/数量调节/提交 | ✅ 已实现 |
| **订单列表** | `order/list` | 状态Tab筛选/分页/下拉刷新 | 待建 |
| **订单详情** | `order/detail` | 明细/状态时间线/操作按钮 | 待建 |
| **购物车** | `order/cart` | 本地存储/批量操作/提交 | 待建 |
| **商品分类** | `goods/category` | 两级分类树 | 待建 |
| **商品列表** | `goods/list` | 网格/列表模式切换 | 待建 |
| **商品详情** | `goods/detail` | 轮播/规格/加购物车 | 待建 |
| **商品搜索** | `goods/search` | 搜索框/历史/结果列表 | 待建 |
| **账户余额** | `payment/account` | 余额/额度/交易记录 | 待建 |
| **账单列表** | `payment/bill-list` | 按月分组/收支标记 | 待建 |
| **充值** | `payment/recharge` | 金额输入/支付方式/Mock支付 | 待建 |
| **门店信息** | `store/profile` | 展示/编辑基本字段 | 待建 |
| **资质认证** | `store/certification` | 上传/查看资质文件 | 待建 |
| **销售报表** | `report/sales` | 趋势图/热销排行 | 待建 |
| **消息中心** | `msg-center/index` | 通知列表/已读未读 | 待建 |
| **账号安全** | `settings/account` | 改密码/换绑手机 | 待建 |

### 5.3 共享层补充

`subpkg-common/api/index.ts` 新增：
- `brandApi.getList()` / `brandApi.getDetail(id)`
- `franchiseApi.apply(data)` / `franchiseApi.myApplications()` / `franchiseApi.uploadDoc(appId, file)`

---

## 6. 总部后台改动

| 页面 | 改动内容 |
|------|---------|
| **Applications.vue** | 修复 API 路径 → `/franchise/applications`；增加审核弹窗（通过+备注 / 驳回+原因）、确认缴费按钮、激活按钮；申请状态标签颜色映射 |
| **Organizations.vue** | 增加 `orgType` 下拉筛选；显示关联 StoreAccount 余额 |
| **Dashboard.vue** | 顶部卡片增加"待审核申请"和"待缴费"统计数 |

---

## 7. 文件变更汇总

```
apps/server/
├── prisma/
│   ├── schema.prisma                        ← Modify: +FranchiseApplication/+枚举/+Brand&User关系
│   └── migrations/
├── src/modules/
│   ├── franchise/                           ← Create (新模块)
│   │   ├── franchise.module.ts
│   │   ├── franchise.controller.ts
│   │   ├── franchise.service.ts
│   │   └── dto/
│   │       ├── create-application.dto.ts
│   │       ├── review-application.dto.ts
│   │       └── confirm-payment.dto.ts
│   ├── organization/
│   │   ├── org.service.ts                   ← Modify: -3 加盟方法
│   │   └── org.controller.ts                ← Modify: -3 加盟端点
│   ├── product/
│   │   ├── product.controller.ts            ← Modify: +2 品牌公开端点
│   │   └── product.service.ts               ← Modify: +品牌查询方法
│   └── app.module.ts                        ← Modify: +FranchiseModule

apps/miniapp/
├── subpkg-prospect/                         ← Create: 8 页面
│   ├── brand/list.vue
│   ├── brand/detail.vue
│   ├── application/guide.vue
│   ├── application/form.vue
│   ├── application/progress.vue
│   ├── application/upload.vue
│   ├── calculator/roi.vue
│   └── contact/index.vue
├── subpkg-franchisee/                       ← Create: 15 页面
│   ├── order/list.vue
│   ├── order/detail.vue
│   ├── order/cart.vue
│   ├── goods/category.vue
│   ├── goods/list.vue
│   ├── goods/detail.vue
│   ├── goods/search.vue
│   ├── payment/account.vue
│   ├── payment/bill-list.vue
│   ├── payment/recharge.vue
│   ├── store/profile.vue
│   ├── store/certification.vue
│   ├── report/sales.vue
│   ├── msg-center/index.vue
│   └── settings/account.vue
└── subpkg-common/
    └── api/index.ts                         ← Modify: +brandApi/+franchiseApi

apps/admin-hq/src/views/
├── Applications.vue                         ← Rewrite
├── Organizations.vue                        ← Modify: +筛选/+余额
└── Dashboard.vue                            ← Modify: +统计卡片
```

---

## 8. 验收标准

匹配 M3 里程碑"加盟闭环"——**申请→审核→缴费→开通账号 E2E 通过**：

| 序号 | 验收条件 | 验证方式 |
|------|---------|---------|
| 1 | 潜在加盟者可在小程序浏览品牌列表和详情 | 打开 prospect/brand/list，查看品牌卡片 |
| 2 | 未登录用户可提交加盟申请表单 | 填写申请→提交→返回成功 |
| 3 | 申请者可查看申请进度时间轴 | 进入 progress 页面，状态正确显示 |
| 4 | 总部管理员可在 admin-hq 看到申请列表 | 打开 Applications 页面，列表正确 |
| 5 | 总部可审核申请（通过/驳回+备注） | 点击通过→状态变为 approved |
| 6 | 总部可确认缴费 | 点击确认缴费→状态变为 payment_confirmed |
| 7 | 总部可激活申请→自动创建门店+账户 | 点击激活→Organization + StoreAccount 生成 |
| 8 | 申请者可见完整时间轴（已提交→审核中→已通过→已缴费→已开通） | progress 页时间轴完整 |
| 9 | 小程序 25 页均可在开发工具中正常打开 | 逐页检查 |
| 10 | 后端 TypeScript 编译通过，Prisma 迁移无错误 | `pnpm build` 成功 |
