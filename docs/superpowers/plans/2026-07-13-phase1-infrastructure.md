# Phase 1: 基础设施 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建 monorepo 骨架，实现认证、RBAC、品牌隔离三大基础设施，为后续业务模块开发提供可验证的基石。

**Architecture:** pnpm monorepo 管理全项目；NestJS 后端承载认证/权限/品牌上下文；Prisma Schema 定义全部数据库模型；shared-* 包提供跨端共享类型和工具。

**Tech Stack:** pnpm 9, Turborepo, NestJS 11, Prisma 5, PostgreSQL 16, Redis 7, TypeScript 5, Jest, Docker

## Global Constraints

- **金额存储**: 所有金额以"分"为单位，使用 INTEGER 类型
- **品牌隔离**: 所有业务表必须含 `brand_id` 字段，通过 Prisma Extension 自动注入
- **流水不可改**: `inventory_transactions` 和 `account_transactions` 只能 INSERT
- **编码不可改**: `spu_code`、`sku_code` 一旦生成不可修改
- **订单快照**: `order_items` 冗余 sku_code/sku_name/unit_price
- **API 路径前缀**: 所有 API 统一 `/api/v1/` 前缀
- **数据库**: PostgreSQL 16，利用 LTREE 扩展
- **包命名**: shared-* 包使用 `@hxfood/` scope

---

## 文件结构

```
hxfood/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── .gitignore
├── .env.example
│
├── packages/
│   ├── shared-types/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── enums.ts          # 订单状态、组织类型、支付方式等枚举
│   │       ├── auth.ts           # JWT Payload、登录DTO等类型
│   │       ├── org.ts            # 组织相关类型
│   │       ├── product.ts        # SPU/SKU/价格策略类型
│   │       ├── order.ts          # 订单相关类型
│   │       ├── inventory.ts      # 库存相关类型
│   │       ├── finance.ts        # 账户/应收类型
│   │       └── rbac.ts           # 角色/权限类型
│   │
│   ├── shared-utils/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── amount.ts         # 金额工具（元↔分转换、格式化）
│   │       ├── idempotency.ts    # 幂等键生成与校验
│   │       ├── order-no.ts       # 订单号生成（日期+Redis自增）
│   │       └── validate.ts       # 通用校验（手机号、统一社会信用代码）
│   │
│   └── shared-config/
│       ├── package.json
│       ├── tsconfig.base.json    # 公共 TS 配置
│       └── eslint.base.js        # 公共 ESLint 配置
│
└── apps/
    └── server/
        ├── package.json
        ├── tsconfig.json
        ├── nest-cli.json
        ├── .env
        ├── docker-compose.yml    # PostgreSQL + Redis 本地开发环境
        ├── prisma/
        │   ├── schema.prisma     # 全部数据库模型
        │   └── seed.ts           # 种子数据（品牌、角色、权限、测试用户）
        │
        └── src/
            ├── main.ts
            ├── app.module.ts
            │
            ├── common/
            │   ├── decorators/
            │   │   ├── current-user.ts       # @CurrentUser()
            │   │   ├── brand-context.ts       # @BrandContext()
            │   │   ├── public.ts              # @Public() 跳过JWT校验
            │   │   └── require-permission.ts  # @RequirePermission('order:create')
            │   │
            │   ├── guards/
            │   │   ├── jwt-auth.guard.ts       # JWT 全局守卫
            │   │   ├── rbac.guard.ts           # RBAC 权限守卫
            │   │   └── brand.guard.ts          # 品牌访问守卫
            │   │
            │   ├── interceptors/
            │   │   ├── brand-context.interceptor.ts  # 品牌上下文注入
            │   │   └── logging.interceptor.ts        # 请求日志
            │   │
            │   ├── filters/
            │   │   └── global-exception.filter.ts
            │   │
            │   ├── pipes/
            │   │   └── validation.pipe.ts
            │   │
            │   ├── prisma/
            │   │   ├── prisma.module.ts
            │   │   ├── prisma.service.ts
            │   │   └── prisma-brand.extension.ts   # 品牌隔离核心
            │   │
            │   └── cls/
            │       └── cls.module.ts               # AsyncLocalStorage 封装
            │
            └── modules/
                ├── auth/
                │   ├── auth.module.ts
                │   ├── auth.controller.ts
                │   ├── auth.service.ts
                │   ├── dto/
                │   │   ├── login.dto.ts
                │   │   ├── wechat-login.dto.ts
                │   │   └── refresh.dto.ts
                │   └── strategies/
                │       ├── jwt.strategy.ts
                │       └── wechat.strategy.ts
                │
                ├── rbac/
                │   ├── rbac.module.ts
                │   ├── rbac.service.ts
                │   └── rbac.controller.ts
                │
                └── brand/
                    ├── brand.module.ts
                    ├── brand.controller.ts
                    └── brand.service.ts
```

---

### Task 1: 初始化 monorepo 工作区

**角色分配:** 总架构师执行（基础设施，不涉及业务代码）

**文件:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `packages/shared-config/package.json`
- Create: `packages/shared-config/tsconfig.base.json`
- Create: `packages/shared-config/eslint.base.js`
- Create: `packages/shared-types/package.json`
- Create: `packages/shared-types/tsconfig.json`
- Create: `packages/shared-utils/package.json`
- Create: `packages/shared-utils/tsconfig.json`

**要求:**
- pnpm workspace 包含 `apps/*` 和 `packages/*`
- Turborepo 配置 `build`、`lint`、`test` 管道
- 所有 shared-* 包使用 `@hxfood/` scope

- [ ] **Step 1: 创建根 package.json**

```json
{
  "name": "hxfood",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "dev": "turbo run dev --parallel",
    "format": "prettier --write \"**/*.{ts,json,md}\""
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "prettier": "^3.3.0",
    "typescript": "^5.5.0"
  },
  "packageManager": "pnpm@9.0.0",
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 2: 创建 pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: 创建 turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"],
      "inputs": ["src/**/*.ts", "test/**/*.ts"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

- [ ] **Step 4: 创建 .gitignore**

```
node_modules/
dist/
.env
*.log
.turbo/
coverage/
docker-data/
```

- [ ] **Step 5: 创建 .env.example**

```env
DATABASE_URL=postgresql://hxfood:hxfood123@localhost:5432/hxfood
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-to-random-64-chars
JWT_REFRESH_SECRET=change-me-to-another-random-64-chars
WECHAT_APPID=your-miniapp-appid
WECHAT_SECRET=your-miniapp-secret
WECHAT_MCHID=your-merchant-id
WECHAT_API_V3_KEY=your-api-v3-key
```

- [ ] **Step 6: 创建 packages/shared-config/package.json**

```json
{
  "name": "@hxfood/shared-config",
  "version": "0.0.1",
  "private": true,
  "files": ["tsconfig.base.json", "eslint.base.js"]
}
```

- [ ] **Step 7: 创建 shared-config/tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "incremental": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

- [ ] **Step 8: 创建 packages/shared-types/package.json**

```json
{
  "name": "@hxfood/shared-types",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "@hxfood/shared-config": "workspace:*",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 9: 创建 shared-types/tsconfig.json**

```json
{
  "extends": "@hxfood/shared-config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 10: 创建 packages/shared-utils/package.json**

```json
{
  "name": "@hxfood/shared-utils",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "tsc --noEmit",
    "test": "jest"
  },
  "dependencies": {
    "@hxfood/shared-types": "workspace:*"
  },
  "devDependencies": {
    "@hxfood/shared-config": "workspace:*",
    "typescript": "^5.5.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.0",
    "@types/jest": "^29.5.0"
  }
}
```

- [ ] **Step 11: 创建 shared-utils/tsconfig.json**

```json
{
  "extends": "@hxfood/shared-config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 12: 安装依赖**

```bash
cd D:/hxfood && pnpm install
```

**产出:** monorepo 骨架搭建完成，`pnpm install` 成功无报错。

---

### Task 2: 搭建 NestJS 服务器骨架 + Prisma

**角色分配:** 程序员（后端）

**文件:**
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/nest-cli.json`
- Create: `apps/server/docker-compose.yml`
- Create: `apps/server/src/main.ts`
- Create: `apps/server/src/app.module.ts`
- Create: `apps/server/src/common/cls/cls.module.ts`
- Create: `apps/server/src/common/prisma/prisma.module.ts`
- Create: `apps/server/src/common/prisma/prisma.service.ts`

**接口:**
- 产出的 PrismaService 可被后续所有模块注入：`constructor(private prisma: PrismaService) {}`
- 产出的 ClsModule 为全局模块，提供 `ClsService` 用于存取品牌上下文

- [ ] **Step 1: 创建 apps/server/package.json**

```json
{
  "name": "@hxfood/server",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "nest start",
    "lint": "eslint \"{src,test}/**/*.ts\"",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "db:migrate": "prisma migrate dev",
    "db:seed": "ts-node prisma/seed.ts",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate"
  },
  "dependencies": {
    "@hxfood/shared-types": "workspace:*",
    "@hxfood/shared-utils": "workspace:*",
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/jwt": "^11.0.0",
    "@nestjs/passport": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/swagger": "^11.0.0",
    "@prisma/client": "^5.18.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "nestjs-cls": "^5.0.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "ioredis": "^5.4.0",
    "bcryptjs": "^2.4.3"
  },
  "devDependencies": {
    "@hxfood/shared-config": "workspace:*",
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "@types/bcryptjs": "^2.4.6",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.0",
    "@types/node": "^22.0.0",
    "@types/passport-jwt": "^4.0.1",
    "jest": "^29.7.0",
    "prisma": "^5.18.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.0"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node",
    "moduleNameMapper": {
      "^@hxfood/shared-types$": "<rootDir>/../../packages/shared-types/src",
      "^@hxfood/shared-utils$": "<rootDir>/../../packages/shared-utils/src"
    }
  }
}
```

- [ ] **Step 2: 创建 apps/server/tsconfig.json**

```json
{
  "extends": "@hxfood/shared-config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@hxfood/shared-types": ["../../packages/shared-types/src"],
      "@hxfood/shared-utils": ["../../packages/shared-utils/src"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 3: 创建 apps/server/nest-cli.json**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 4: 创建 apps/server/docker-compose.yml**

```yaml
version: "3.8"
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: hxfood
      POSTGRES_USER: hxfood
      POSTGRES_PASSWORD: hxfood123
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    command: >
      postgres
      -c wal_level=logical
      -c max_connections=100

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    command: redis-server --appendonly yes

volumes:
  pgdata:
  redisdata:
```

- [ ] **Step 5: 启动 Docker 开发环境**

```bash
cd D:/hxfood/apps/server && docker compose up -d
```

Expected: `docker compose ps` 显示 postgres 和 redis 均为 `Up` 状态。

- [ ] **Step 6: 创建 apps/server/src/main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(3000);
  console.log('Server running on http://localhost:3000');
}
bootstrap();
```

- [ ] **Step 7: 创建 NestJS CLS 模块**

```typescript
// src/common/cls/cls.module.ts
import { Global, Module } from '@nestjs/common';
import { ClsModule as NestClsModule } from 'nestjs-cls';
import { Request } from 'express';

@Global()
@Module({
  imports: [
    NestClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: Request) => req.headers['x-request-id'] as string ?? crypto.randomUUID(),
      },
    }),
  ],
  exports: [NestClsModule],
})
export class ClsModule {}
```

- [ ] **Step 8: 创建 Prisma 模块**

```typescript
// src/common/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

```typescript
// src/common/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 9: 创建根模块**

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ClsModule } from './common/cls/cls.module';
import { PrismaModule } from './common/prisma/prisma.module';

@Module({
  imports: [ClsModule, PrismaModule],
})
export class AppModule {}
```

- [ ] **Step 10: 安装依赖并验证编译**

```bash
cd D:/hxfood && pnpm install
cd D:/hxfood/apps/server && pnpm run build
```

Expected: `pnpm run build` 成功，`dist/main.js` 产生。

**产出:** NestJS 服务器可编译运行，PostgreSQL + Redis 通过 Docker 就绪。

---

### Task 3: 创建 Prisma Schema（全部数据库模型）

**角色分配:** 程序员（后端）

**文件:**
- Create: `apps/server/prisma/schema.prisma`
- Create: `apps/server/prisma/seed.ts`

**接口:**
- 所有表名、字段名、类型、关系严格按照设计文档第4节
- 枚举类型在 schema 中定义，Prisma Client 自动生成 TypeScript 类型
- 金额字段统一使用 `Int`（分），不使用 `Decimal` 或 `Float`
- 启用 PostgreSQL LTREE 扩展（`CREATE EXTENSION IF NOT EXISTS ltree;`）

- [ ] **Step 1: 编写完整的 schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  extensions = [ltree, postgis]
}

// ===================== 枚举 =====================

enum OrgStatus { active inactive suspended }
enum OrgType   { headquarters central_kitchen franchise_store supplier warehouse }
enum UserStatus { active disabled }
enum StorageType { ambient refrigerated frozen }
enum PricePolicyType { default store_level promotion contract }

enum OrderType   { purchase sale return transfer }
enum OrderStatus {
  draft pending_approval approved rejected
  pending_production in_production partially_produced produced
  partially_shipped shipped received cancelled
}
enum PaymentMethod { balance wechat credit mixed }

enum ItemStatus { normal cancelled short }
enum ApprovalType { submit review reject cancel }

enum WarehouseType { finished raw_material return virtual }
enum InvStatus { normal quarantined scrapped }
enum InvTransType {
  purchase_in production_in return_in sale_out scrap_out
  transfer_out transfer_in adjustment lock unlock initial
}

enum InTransitStatus { in_transit received partial_received }

enum AccountStatus { normal frozen closed }
enum TransType { recharge order_pay refund adjustment credit_repay }
enum ReceivableStatus { pending partial paid overdue written_off }

// ===================== 核心表 =====================

model Brand {
  id         String     @id @default(uuid()) @db.Uuid
  name       String     @db.VarChar(100)
  code       String     @unique @db.VarChar(20)
  status     OrgStatus  @default(active)
  config     Json?
  createdAt  DateTime   @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt  DateTime   @updatedAt @map("updated_at") @db.Timestamptz()

  organizations Organization[]
  categories    Category[]
  spus          Spu[]
  skus          Sku[]
  pricePolicies PricePolicy[]
  orders        Order[]
  warehouses    Warehouse[]
  storeAccounts StoreAccount[]

  @@map("brands")
}

model Organization {
  id           String     @id @default(uuid()) @db.Uuid
  brandId      String     @map("brand_id") @db.Uuid
  parentId     String?    @map("parent_id") @db.Uuid
  orgType      OrgType    @map("org_type")
  name         String     @db.VarChar(200)
  code         String?    @db.VarChar(50)
  contactName  String?    @map("contact_name") @db.VarChar(100)
  contactPhone String?    @map("contact_phone") @db.VarChar(20)
  address      Json?
  location     Unsupported("geography(Point)")?
  status       OrgStatus  @default(active)
  config       Json?
  createdAt    DateTime   @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt    DateTime   @updatedAt @map("updated_at") @db.Timestamptz()

  brand    Brand            @relation(fields: [brandId], references: [id])
  parent   Organization?    @relation("OrgTree", fields: [parentId], references: [id])
  children Organization[]   @relation("OrgTree")

  userOrgRoles  UserOrgRole[]
  orders        Order[]        @relation("StoreOrders")
  warehouses    Warehouse[]
  storeAccount  StoreAccount?

  @@map("organizations")
}

model User {
  id           String     @id @default(uuid()) @db.Uuid
  openid       String?    @db.VarChar(64)
  unionid      String?    @db.VarChar(64)
  username     String?    @db.VarChar(50)
  passwordHash String?    @map("password_hash") @db.VarChar(255)
  realName     String?    @map("real_name") @db.VarChar(50)
  phone        String?    @db.VarChar(20)
  avatar       String?    @db.VarChar(500)
  status       UserStatus @default(active)
  createdAt    DateTime   @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt    DateTime   @updatedAt @map("updated_at") @db.Timestamptz()

  userOrgRoles UserOrgRole[]

  @@map("users")
}

model UserOrgRole {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  orgId     String    @map("org_id") @db.Uuid
  roleId    String    @map("role_id") @db.Uuid
  isDefault Boolean   @default(false) @map("is_default")
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz()

  user User          @relation(fields: [userId], references: [id])
  org  Organization  @relation(fields: [orgId], references: [id])
  role Role          @relation(fields: [roleId], references: [id])

  @@unique([userId, orgId, roleId])
  @@map("user_org_roles")
}

model Role {
  id          String    @id @default(uuid()) @db.Uuid
  brandId     String?   @map("brand_id") @db.Uuid
  code        String    @db.VarChar(50)
  name        String    @db.VarChar(100)
  description String?
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz()

  userOrgRoles     UserOrgRole[]
  rolePermissions  RolePermission[]

  @@unique([brandId, code])
  @@map("roles")
}

model Permission {
  id          String    @id @default(uuid()) @db.Uuid
  code        String    @unique @db.VarChar(100)
  resource    String    @db.VarChar(50)
  action      String    @db.VarChar(50)
  description String?
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz()

  rolePermissions RolePermission[]

  @@map("permissions")
}

model RolePermission {
  roleId       String @map("role_id") @db.Uuid
  permissionId String @map("permission_id") @db.Uuid

  role       Role       @relation(fields: [roleId], references: [id])
  permission Permission @relation(fields: [permissionId], references: [id])

  @@id([roleId, permissionId])
  @@map("role_permissions")
}

// ===================== 商品模型 =====================

model Category {
  id        String   @id @default(uuid()) @db.Uuid
  brandId   String   @map("brand_id") @db.Uuid
  parentId  String?  @map("parent_id") @db.Uuid
  name      String   @db.VarChar(100)
  sortOrder Int      @default(0) @map("sort_order")
  path      String   @db.Ltree
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz()

  brand    Brand      @relation(fields: [brandId], references: [id])
  parent   Category?  @relation("CatTree", fields: [parentId], references: [id])
  children Category[] @relation("CatTree")

  @@map("categories")
}

model Spu {
  id             String      @id @default(uuid()) @db.Uuid
  brandId        String      @map("brand_id") @db.Uuid
  categoryId     String?     @map("category_id") @db.Uuid
  spuCode        String      @unique @map("spu_code") @db.VarChar(50)
  name           String      @db.VarChar(200)
  unit           String?     @db.VarChar(20)
  spec           String?     @db.VarChar(200)
  images         Json?
  shelfLifeDays  Int?        @map("shelf_life_days")
  storageType    StorageType @default(ambient) @map("storage_type")
  isActive       Boolean     @default(true) @map("is_active")
  createdAt      DateTime    @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt      DateTime    @updatedAt @map("updated_at") @db.Timestamptz()

  brand    Brand     @relation(fields: [brandId], references: [id])
  category Category? @relation(fields: [categoryId], references: [id])
  skus     Sku[]

  @@map("spus")
}

model Sku {
  id            String   @id @default(uuid()) @db.Uuid
  spuId         String   @map("spu_id") @db.Uuid
  brandId       String   @map("brand_id") @db.Uuid
  skuCode       String   @unique @map("sku_code") @db.VarChar(50)
  specDetail    String?  @map("spec_detail") @db.VarChar(200)
  price         Int      @default(0)
  costPrice     Int?     @map("cost_price")
  weightKg      Decimal? @map("weight_kg") @db.Decimal(8, 3)
  minOrderQty   Int      @default(1) @map("min_order_qty")
  stepOrderQty  Int      @default(1) @map("step_order_qty")
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt     DateTime @updatedAt @map("updated_at") @db.Timestamptz()

  spu          Spu           @relation(fields: [spuId], references: [id])
  brand        Brand         @relation(fields: [brandId], references: [id])
  pricePolicies PricePolicy[]
  orderItems   OrderItem[]
  inventory    Inventory[]

  @@map("skus")
}

model PricePolicy {
  id         String          @id @default(uuid()) @db.Uuid
  brandId    String          @map("brand_id") @db.Uuid
  skuId      String          @map("sku_id") @db.Uuid
  policyType PricePolicyType @map("policy_type")
  targetId   String?         @map("target_id") @db.Uuid
  price      Int
  startAt    DateTime?       @map("start_at") @db.Timestamptz()
  endAt      DateTime?       @map("end_at") @db.Timestamptz()
  createdAt  DateTime        @default(now()) @map("created_at") @db.Timestamptz()

  brand Brand @relation(fields: [brandId], references: [id])
  sku   Sku   @relation(fields: [skuId], references: [id])

  @@unique([skuId, policyType, targetId, startAt])
  @@map("price_policies")
}

// ===================== 订单模型 =====================

model Order {
  id              String        @id @default(uuid()) @db.Uuid
  brandId         String        @map("brand_id") @db.Uuid
  orderNo         String        @unique @map("order_no") @db.VarChar(32)
  storeId         String        @map("store_id") @db.Uuid
  orderType       OrderType     @default(sale) @map("order_type")
  orderStatus     OrderStatus   @default(draft) @map("order_status")
  totalAmount     Int           @map("total_amount")
  paymentMethod   PaymentMethod? @map("payment_method")
  shippingAddress Json?
  expectedAt      DateTime?     @map("expected_at") @db.Date
  notes           String?       @db.Text
  createdBy       String        @map("created_by") @db.Uuid
  submittedAt     DateTime?     @map("submitted_at") @db.Timestamptz()
  approvedAt      DateTime?     @map("approved_at") @db.Timestamptz()
  producedAt      DateTime?     @map("produced_at") @db.Timestamptz()
  shippedAt       DateTime?     @map("shipped_at") @db.Timestamptz()
  receivedAt      DateTime?     @map("received_at") @db.Timestamptz()
  cancelledAt     DateTime?     @map("cancelled_at") @db.Timestamptz()
  createdAt       DateTime      @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt       DateTime      @updatedAt @map("updated_at") @db.Timestamptz()

  brand          Brand              @relation(fields: [brandId], references: [id])
  store          Organization       @relation("StoreOrders", fields: [storeId], references: [id])
  items          OrderItem[]
  approvals      OrderApproval[]
  statusLogs     OrderStatusLog[]
  receivable     Receivable?
  inTransits     InTransitInventory[]

  @@index([storeId, orderStatus, createdAt(sort: Desc)])
  @@index([brandId, orderStatus, createdAt(sort: Desc)])
  @@map("orders")
}

model OrderItem {
  id          String     @id @default(uuid()) @db.Uuid
  orderId     String     @map("order_id") @db.Uuid
  brandId     String     @map("brand_id") @db.Uuid
  skuId       String     @map("sku_id") @db.Uuid
  skuCode     String     @map("sku_code") @db.VarChar(50)
  skuName     String     @map("sku_name") @db.VarChar(200)
  unitPrice   Int        @map("unit_price")
  quantity    Decimal    @db.Decimal(10, 3)
  shippedQty  Decimal    @default(0) @map("shipped_qty") @db.Decimal(10, 3)
  receivedQty Decimal    @default(0) @map("received_qty") @db.Decimal(10, 3)
  amount      Int
  status      ItemStatus @default(normal)
  lotNo       String?    @map("lot_no") @db.VarChar(50)
  createdAt   DateTime   @default(now()) @map("created_at") @db.Timestamptz()

  order Order @relation(fields: [orderId], references: [id])
  sku   Sku   @relation(fields: [skuId], references: [id])

  @@map("order_items")
}

model OrderApproval {
  id           String       @id @default(uuid()) @db.Uuid
  orderId      String       @map("order_id") @db.Uuid
  brandId      String       @map("brand_id") @db.Uuid
  approverId   String       @map("approver_id") @db.Uuid
  approvalType ApprovalType @map("approval_type")
  comment      String?      @db.Text
  createdAt    DateTime     @default(now()) @map("created_at") @db.Timestamptz()

  order Order @relation(fields: [orderId], references: [id])

  @@map("order_approvals")
}

model OrderStatusLog {
  id         String       @id @default(uuid()) @db.Uuid
  orderId    String       @map("order_id") @db.Uuid
  brandId    String       @map("brand_id") @db.Uuid
  fromStatus OrderStatus? @map("from_status")
  toStatus   OrderStatus  @map("to_status")
  operatorId String?      @map("operator_id") @db.Uuid
  remark     String?      @db.Text
  createdAt  DateTime     @default(now()) @map("created_at") @db.Timestamptz()

  order Order @relation(fields: [orderId], references: [id])

  @@map("order_status_logs")
}

// ===================== 库存模型 =====================

model Warehouse {
  id            String        @id @default(uuid()) @db.Uuid
  brandId       String        @map("brand_id") @db.Uuid
  orgId         String        @map("org_id") @db.Uuid
  warehouseType WarehouseType @map("warehouse_type")
  name          String        @db.VarChar(100)
  address       Json?
  createdAt     DateTime      @default(now()) @map("created_at") @db.Timestamptz()

  brand Brand        @relation(fields: [brandId], references: [id])
  org   Organization @relation(fields: [orgId], references: [id])

  @@map("warehouses")
}

model Inventory {
  id            String    @id @default(uuid()) @db.Uuid
  brandId       String    @map("brand_id") @db.Uuid
  warehouseId   String    @map("warehouse_id") @db.Uuid
  skuId         String    @map("sku_id") @db.Uuid
  lotNo         String    @map("lot_no") @db.VarChar(50)
  quantity      Int       @default(0)
  lockedQty     Int       @default(0) @map("locked_qty")
  unit          String?   @db.VarChar(20)
  producedAt    DateTime? @map("produced_at") @db.Date
  expiryAt      DateTime? @map("expiry_at") @db.Date
  status        InvStatus @default(normal)
  updatedAt     DateTime  @updatedAt @map("updated_at") @db.Timestamptz()

  warehouse    Warehouse              @relation(fields: [warehouseId], references: [id])
  sku          Sku                    @relation(fields: [skuId], references: [id])
  transactions InventoryTransaction[]

  @@unique([warehouseId, skuId, lotNo])
  @@map("inventory")
}

model InventoryTransaction {
  id           String      @id @default(uuid()) @db.Uuid
  brandId      String      @map("brand_id") @db.Uuid
  warehouseId  String      @map("warehouse_id") @db.Uuid
  skuId        String      @map("sku_id") @db.Uuid
  lotNo        String      @map("lot_no") @db.VarChar(50)
  transType    InvTransType @map("trans_type")
  quantity     Int
  balanceAfter Int         @map("balance_after")
  bizType      String?     @map("biz_type") @db.VarChar(50)
  bizId        String?     @map("biz_id") @db.Uuid
  bizNo        String?     @map("biz_no") @db.VarChar(50)
  operatorId   String?     @map("operator_id") @db.Uuid
  remark       String?     @db.Text
  createdAt    DateTime    @default(now()) @map("created_at") @db.Timestamptz()

  warehouse Warehouse  @relation(fields: [warehouseId], references: [id])
  sku       Sku        @relation(fields: [skuId], references: [id])

  @@index([bizType, bizId])
  @@index([skuId, createdAt])
  @@map("inventory_transactions")
}

model InTransitInventory {
  id         String          @id @default(uuid()) @db.Uuid
  brandId    String          @map("brand_id") @db.Uuid
  shipmentId String          @map("shipment_id") @db.Uuid
  orderId    String          @map("order_id") @db.Uuid
  skuId      String          @map("sku_id") @db.Uuid
  lotNo      String?         @map("lot_no") @db.VarChar(50)
  quantity   Int
  status     InTransitStatus @default(in_transit)
  shippedAt  DateTime        @default(now()) @map("shipped_at") @db.Timestamptz()
  receivedAt DateTime?       @map("received_at") @db.Timestamptz()

  order Order @relation(fields: [orderId], references: [id])

  @@map("in_transit_inventory")
}

// ===================== 账户模型 =====================

model StoreAccount {
  id               String        @id @default(uuid()) @db.Uuid
  brandId          String        @map("brand_id") @db.Uuid
  storeId          String        @unique @map("store_id") @db.Uuid
  balance          Int           @default(0)
  creditLimit      Int           @default(0) @map("credit_limit")
  creditDays       Int           @default(30) @map("credit_days")
  frozenAmount     Int           @default(0) @map("frozen_amount")
  status           AccountStatus @default(normal)
  updatedAt        DateTime      @updatedAt @map("updated_at") @db.Timestamptz()

  brand        Brand                @relation(fields: [brandId], references: [id])
  store        Organization         @relation(fields: [storeId], references: [id])
  transactions AccountTransaction[]

  @@map("store_accounts")
}

model AccountTransaction {
  id           String    @id @default(uuid()) @db.Uuid
  brandId      String    @map("brand_id") @db.Uuid
  storeId      String    @map("store_id") @db.Uuid
  orderId      String?   @map("order_id") @db.Uuid
  transType    TransType @map("trans_type")
  amount       Int
  balanceAfter Int       @map("balance_after")
  bizNo        String?   @map("biz_no") @db.VarChar(50)
  remark       String?   @db.Text
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz()

  storeAccount StoreAccount @relation(fields: [storeId], references: [storeId])

  @@index([storeId, createdAt])
  @@map("account_transactions")
}

model Receivable {
  id         String           @id @default(uuid()) @db.Uuid
  brandId    String           @map("brand_id") @db.Uuid
  storeId    String           @map("store_id") @db.Uuid
  orderId    String           @unique @map("order_id") @db.Uuid
  amount     Int
  paidAmount Int              @default(0) @map("paid_amount")
  dueDate    DateTime         @map("due_date") @db.Date
  status     ReceivableStatus @default(pending)
  settledAt  DateTime?        @map("settled_at") @db.Timestamptz()
  createdAt  DateTime         @default(now()) @map("created_at") @db.Timestamptz()

  order Order @relation(fields: [orderId], references: [id])

  @@map("receivables")
}
```

- [ ] **Step 2: 运行 Prisma 迁移**

```bash
cd D:/hxfood/apps/server && npx prisma migrate dev --name init
```

Expected: 迁移成功，数据库表创建完毕。

- [ ] **Step 3: 创建种子数据**

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 创建两个品牌
  const brandA = await prisma.brand.create({
    data: { name: '味优炸鸡', code: 'WYZJ' },
  });
  const brandB = await prisma.brand.create({
    data: { name: '面面聚道', code: 'MMJD' },
  });

  // 创建组织（品牌A）
  const hqA = await prisma.organization.create({
    data: { brandId: brandA.id, name: '味优炸鸡总部', code: 'WYZJ-HQ', orgType: 'headquarters' },
  });
  const ckA = await prisma.organization.create({
    data: { brandId: brandA.id, parentId: hqA.id, name: '味优中央厨房', code: 'WYZJ-CK', orgType: 'central_kitchen' },
  });
  const storeA1 = await prisma.organization.create({
    data: { brandId: brandA.id, parentId: hqA.id, name: '味优炸鸡-北京朝阳店', code: 'WYZJ-001', orgType: 'franchise_store' },
  });

  // 创建权限
  const permissions = [
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

  for (const p of permissions) {
    await prisma.permission.create({ data: p });
  }

  // 创建角色并分配权限
  const allPerms = await prisma.permission.findMany();

  // 总部超管 (品牌A)
  const superAdminRole = await prisma.role.create({
    data: { brandId: brandA.id, code: 'super_admin', name: '总部超管' },
  });
  for (const p of allPerms) {
    await prisma.rolePermission.create({
      data: { roleId: superAdminRole.id, permissionId: p.id },
    });
  }

  // 加盟店长 (全局角色，不限品牌)
  const storeAdminRole = await prisma.role.create({
    data: { code: 'store_admin', name: '加盟店长' },
  });
  const storeAdminPerms = ['order:create', 'order:view', 'order:cancel', 'product:view', 'account:view'];
  for (const code of storeAdminPerms) {
    const p = allPerms.find(p => p.code === code);
    if (p) {
      await prisma.rolePermission.create({
        data: { roleId: storeAdminRole.id, permissionId: p.id },
      });
    }
  }

  // 创建测试用户
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

  // 创建加盟店账户
  await prisma.storeAccount.create({
    data: { brandId: brandA.id, storeId: storeA1.id, balance: 100000, creditLimit: 50000 },
  });

  console.log('Seed data created successfully!');
  console.log('Test accounts:');
  console.log('  Admin:  admin / test123');
  console.log('  Store:  store01 / test123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 4: 运行种子数据**

```bash
cd D:/hxfood/apps/server && npx ts-node prisma/seed.ts
```

Expected: 种子数据创建成功，输出测试账号信息。

**产出:** 完整 Prisma Schema 迁移成功，数据库包含全部表、索引、关系，种子数据可用。

---

### Task 4: 创建共享类型包 (@hxfood/shared-types)

**角色分配:** 程序员（后端）

**文件:**
- Create: `packages/shared-types/src/index.ts`
- Create: `packages/shared-types/src/enums.ts`
- Create: `packages/shared-types/src/auth.ts`
- Create: `packages/shared-types/src/order.ts`
- Create: `packages/shared-types/src/product.ts`
- Create: `packages/shared-types/src/inventory.ts`
- Create: `packages/shared-types/src/finance.ts`
- Create: `packages/shared-types/src/rbac.ts`

- [ ] **Step 1: 创建 enums.ts**

```typescript
// packages/shared-types/src/enums.ts

export enum OrderType {
  PURCHASE = 'purchase',
  SALE = 'sale',
  RETURN = 'return',
  TRANSFER = 'transfer',
}

export enum OrderStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PENDING_PRODUCTION = 'pending_production',
  IN_PRODUCTION = 'in_production',
  PARTIALLY_PRODUCED = 'partially_produced',
  PRODUCED = 'produced',
  PARTIALLY_SHIPPED = 'partially_shipped',
  SHIPPED = 'shipped',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  BALANCE = 'balance',
  WECHAT = 'wechat',
  CREDIT = 'credit',
  MIXED = 'mixed',
}

export enum OrgType {
  HEADQUARTERS = 'headquarters',
  CENTRAL_KITCHEN = 'central_kitchen',
  FRANCHISE_STORE = 'franchise_store',
  SUPPLIER = 'supplier',
  WAREHOUSE = 'warehouse',
}

export enum TransType {
  RECHARGE = 'recharge',
  ORDER_PAY = 'order_pay',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
  CREDIT_REPAY = 'credit_repay',
}

export enum ReceivableStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue',
  WRITTEN_OFF = 'written_off',
}

export enum InvTransType {
  PURCHASE_IN = 'purchase_in',
  PRODUCTION_IN = 'production_in',
  RETURN_IN = 'return_in',
  SALE_OUT = 'sale_out',
  SCRAP_OUT = 'scrap_out',
  TRANSFER_OUT = 'transfer_out',
  TRANSFER_IN = 'transfer_in',
  ADJUSTMENT = 'adjustment',
  LOCK = 'lock',
  UNLOCK = 'unlock',
  INITIAL = 'initial',
}

export enum PricePolicyType {
  DEFAULT = 'default',
  STORE_LEVEL = 'store_level',
  PROMOTION = 'promotion',
  CONTRACT = 'contract',
}

export enum StorageType {
  AMBIENT = 'ambient',
  REFRIGERATED = 'refrigerated',
  FROZEN = 'frozen',
}
```

- [ ] **Step 2: 创建 auth.ts**

```typescript
// packages/shared-types/src/auth.ts

export interface JwtPayload {
  sub: string;             // userId
  orgId: string;           // 当前组织ID
  orgType: string;         // 组织类型
  brands: string[];        // 可操作品牌ID列表
  roles: string[];         // 角色编码列表
  permissions: string[];   // 权限码列表
  iat?: number;
  exp?: number;
}

export interface LoginDto {
  username: string;
  password: string;
  brandId?: string;
}

export interface WechatLoginDto {
  code: string;            // wx.login() 返回的 code
  brandId?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserProfile {
  id: string;
  username: string;
  realName: string;
  phone: string;
  avatar: string;
  orgs: OrgProfile[];
  currentOrg?: OrgProfile;
}

export interface OrgProfile {
  id: string;
  name: string;
  orgType: string;
  brandId: string;
  brandName: string;
  roles: string[];
  permissions: string[];
}
```

- [ ] **Step 3: 创建 order.ts**

```typescript
// packages/shared-types/src/order.ts

export interface CreateOrderItemDto {
  skuId: string;
  quantity: number;        // 支持小数 (DECIMAL)
}

export interface CreateOrderDto {
  idempotencyKey: string;  // 幂等键
  items: CreateOrderItemDto[];
  paymentMethod: 'balance' | 'wechat' | 'credit' | 'mixed';
  shippingAddress?: object;
  expectedAt?: string;     // ISO date
  notes?: string;
}

export interface OrderItemVo {
  id: string;
  skuCode: string;
  skuName: string;
  unitPrice: number;       // 元（前端展示用）
  quantity: number;
  shippedQty: number;
  receivedQty: number;
  amount: number;          // 元
  status: string;
  lotNo?: string;
}

export interface OrderVo {
  id: string;
  orderNo: string;
  orderStatus: string;
  orderType: string;
  totalAmount: number;     // 元
  paymentMethod: string;
  storeName: string;
  items: OrderItemVo[];
  timeline: OrderTimelineEntry[];
  createdAt: string;
}

export interface OrderTimelineEntry {
  time: string;
  status: string;
  operator: string;
  remark?: string;
}
```

- [ ] **Step 4: 创建 product.ts, inventory.ts, finance.ts, rbac.ts**

```typescript
// packages/shared-types/src/product.ts
export interface SkuVo {
  id: string;
  skuCode: string;
  name: string;         // SPU name
  specDetail: string;
  price: number;        // 元
  stockAvailable: number;
  minOrderQty: number;
  stepOrderQty: number;
  images: string[];
}
```

```typescript
// packages/shared-types/src/inventory.ts
export interface InventoryVo {
  skuId: string;
  skuCode: string;
  skuName: string;
  lotNo: string;
  quantity: number;
  lockedQty: number;
  availableQty: number;
  expiryAt: string;
  status: string;
}
```

```typescript
// packages/shared-types/src/finance.ts
export interface StoreAccountVo {
  storeId: string;
  storeName: string;
  balance: number;          // 元
  creditLimit: number;      // 元
  frozenAmount: number;     // 元
  availableBalance: number; // 元
  status: string;
}

export interface AccountTransactionVo {
  id: string;
  transType: string;
  amount: number;           // 元
  balanceAfter: number;     // 元
  bizNo?: string;
  remark?: string;
  createdAt: string;
}

export interface ReceivableVo {
  id: string;
  orderId: string;
  orderNo: string;
  amount: number;           // 元
  paidAmount: number;       // 元
  dueDate: string;
  status: string;
}
```

```typescript
// packages/shared-types/src/rbac.ts
export interface PermissionCode {
  code: string;
  resource: string;
  action: string;
  description: string;
}

export interface RoleVo {
  id: string;
  code: string;
  name: string;
  brandId?: string;
  permissions: PermissionCode[];
}
```

- [ ] **Step 5: 创建统一导出**

```typescript
// packages/shared-types/src/index.ts
export * from './enums';
export * from './auth';
export * from './order';
export * from './product';
export * from './inventory';
export * from './finance';
export * from './rbac';
```

- [ ] **Step 6: 验证编译**

```bash
cd D:/hxfood/packages/shared-types && pnpm run build
```

Expected: 编译成功。

---

### Task 5: 创建共享工具包 (@hxfood/shared-utils)

**角色分配:** 程序员（后端）

**文件:**
- Create: `packages/shared-utils/src/index.ts`
- Create: `packages/shared-utils/src/amount.ts`
- Create: `packages/shared-utils/src/amount.spec.ts`
- Create: `packages/shared-utils/src/idempotency.ts`
- Create: `packages/shared-utils/src/order-no.ts`
- Create: `packages/shared-utils/src/validate.ts`
- Create: `packages/shared-utils/src/validate.spec.ts`

- [ ] **Step 1: 创建 amount.ts — 金额工具体系**

```typescript
// packages/shared-utils/src/amount.ts

/** 元转分: 12.34 → 1234 */
export function yuanToFen(yuan: number): number {
  return Math.round(yuan * 100);
}

/** 分转元: 1234 → 12.34 */
export function fenToYuan(fen: number): number {
  return fen / 100;
}

/** 分转展示字符串: 1234 → "12.34" */
export function formatFen(fen: number): string {
  return (fen / 100).toFixed(2);
}

/** 分转展示字符串（带¥符号）: 1234 → "¥12.34" */
export function formatMoney(fen: number): string {
  return `¥${formatFen(fen)}`;
}

/** 安全乘法: 单价(分) × 数量 = 金额(分)，使用整数运算避免浮点 */
export function multiplyPrice(unitPriceFen: number, quantity: number): number {
  // 数量可能是小数（如 0.5 箱），先放大10倍转为整数计算再缩回
  const scale = 1000;
  const qtyScaled = Math.round(quantity * scale);
  return Math.round((unitPriceFen * qtyScaled) / scale);
}
```

- [ ] **Step 2: 创建 amount.spec.ts — 金额测试**

```typescript
// packages/shared-utils/src/amount.spec.ts
import { yuanToFen, fenToYuan, formatFen, multiplyPrice } from './amount';

describe('Amount Utils', () => {
  describe('yuanToFen', () => {
    it('should convert 12.34 to 1234', () => {
      expect(yuanToFen(12.34)).toBe(1234);
    });
    it('should convert 0.01 to 1', () => {
      expect(yuanToFen(0.01)).toBe(1);
    });
    it('should convert 0 to 0', () => {
      expect(yuanToFen(0)).toBe(0);
    });
    it('should round 0.005 to 1 (0.5分进位到1分)', () => {
      expect(yuanToFen(0.005)).toBe(1);
    });
  });

  describe('fenToYuan', () => {
    it('should convert 1234 to 12.34', () => {
      expect(fenToYuan(1234)).toBe(12.34);
    });
    it('should convert 1 to 0.01', () => {
      expect(fenToYuan(1)).toBe(0.01);
    });
  });

  describe('formatFen', () => {
    it('should format 1234 as "12.34"', () => {
      expect(formatFen(1234)).toBe('12.34');
    });
    it('should format 0 as "0.00"', () => {
      expect(formatFen(0)).toBe('0.00');
    });
  });

  describe('multiplyPrice', () => {
    it('should calculate 1000分 × 3 = 3000分', () => {
      expect(multiplyPrice(1000, 3)).toBe(3000);
    });
    it('should calculate 2500分 × 0.5 = 1250分', () => {
      expect(multiplyPrice(2500, 0.5)).toBe(1250);
    });
    it('should handle 1分 × 0.001 = 0分 (小于1分截断)', () => {
      const result = multiplyPrice(1, 0.001);
      expect(result).toBe(0);
    });
  });
});
```

- [ ] **Step 3: 创建 idempotency.ts 和 order-no.ts**

```typescript
// packages/shared-utils/src/idempotency.ts
import { createHash } from 'crypto';

/** 生成幂等键: SHA256(userId + timestamp + random) */
export function generateIdempotencyKey(userId: string): string {
  const ts = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 10);
  return createHash('sha256').update(`${userId}:${ts}:${random}`).digest('hex').substring(0, 32);
}

/** 校验幂等键格式 */
export function isValidIdempotencyKey(key: string): boolean {
  return /^[a-f0-9]{32}$/.test(key);
}
```

```typescript
// packages/shared-utils/src/order-no.ts

/** 生成订单号: OR + 日期(YYMMDD) + 6位序号 */
export function generateOrderNo(date: Date, seq: number): string {
  const y = date.getFullYear().toString().substring(2);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const seqStr = seq.toString().padStart(6, '0');
  return `OR${y}${m}${d}${seqStr}`;
}
```

- [ ] **Step 4: 创建 validate.ts 和 validate.spec.ts**

```typescript
// packages/shared-utils/src/validate.ts

/** 校验手机号 (中国大陆) */
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

/** 校验统一社会信用代码 */
export function isValidUSCC(code: string): boolean {
  return /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/.test(code);
}

/** 校验正整数 */
export function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}
```

```typescript
// packages/shared-utils/src/validate.spec.ts
import { isValidPhone, isValidUSCC, isPositiveInteger } from './validate';

describe('Validate Utils', () => {
  describe('isValidPhone', () => {
    it('should accept valid phone 13812345678', () => {
      expect(isValidPhone('13812345678')).toBe(true);
    });
    it('should reject phone starting with 2', () => {
      expect(isValidPhone('23812345678')).toBe(false);
    });
    it('should reject short phone', () => {
      expect(isValidPhone('1381234567')).toBe(false);
    });
    it('should reject empty string', () => {
      expect(isValidPhone('')).toBe(false);
    });
  });

  describe('isValidUSCC', () => {
    it('should accept valid 18-char code', () => {
      const valid = '91310113MA1GL5N31X';  // 真实样例
      expect(isValidUSCC(valid)).toBe(true);
    });
    it('should reject code with I/O/Z/S/V (非法字符)', () => {
      expect(isValidUSCC('91310113MA1GL5N31I')).toBe(false);
    });
  });

  describe('isPositiveInteger', () => {
    it('should accept 100', () => expect(isPositiveInteger(100)).toBe(true));
    it('should reject 0', () => expect(isPositiveInteger(0)).toBe(false));
    it('should reject -1', () => expect(isPositiveInteger(-1)).toBe(false));
    it('should reject 1.5', () => expect(isPositiveInteger(1.5)).toBe(false));
  });
});
```

- [ ] **Step 5: 创建统一导出**

```typescript
// packages/shared-utils/src/index.ts
export * from './amount';
export * from './idempotency';
export * from './order-no';
export * from './validate';
```

- [ ] **Step 6: 运行测试验证**

```bash
cd D:/hxfood/packages/shared-utils && pnpm run test
```

Expected: 10 个测试用例全部 PASS。

---

### Task 6: 实现认证模块 (Auth)

**角色分配:** 程序员（后端）

**文件:**
- Create: `apps/server/src/modules/auth/auth.module.ts`
- Create: `apps/server/src/modules/auth/auth.controller.ts`
- Create: `apps/server/src/modules/auth/auth.service.ts`
- Create: `apps/server/src/modules/auth/dto/login.dto.ts`
- Create: `apps/server/src/modules/auth/dto/wechat-login.dto.ts`
- Create: `apps/server/src/modules/auth/dto/refresh.dto.ts`
- Create: `apps/server/src/modules/auth/strategies/jwt.strategy.ts`
- Create: `apps/server/src/modules/auth/strategies/wechat.strategy.ts`
- Create: `apps/server/src/modules/auth/auth.service.spec.ts`

**前置:** Task 3 (Prisma Schema) 和 Task 4 (shared-types) 必须完成

- [ ] **Step 1: 创建 Login DTO**

```typescript
// src/modules/auth/dto/login.dto.ts
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'test123' })
  @IsString()
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  brandId?: string;
}
```

- [ ] **Step 2: 创建微信登录 DTO**

```typescript
// src/modules/auth/dto/wechat-login.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class WechatLoginDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  brandId?: string;
}
```

- [ ] **Step 3: 创建 Refresh DTO**

```typescript
// src/modules/auth/dto/refresh.dto.ts
import { IsString } from 'class-validator';

export class RefreshDto {
  @IsString()
  refreshToken: string;
}
```

- [ ] **Step 4: 创建 JWT Strategy**

```typescript
// src/modules/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ClsService } from 'nestjs-cls';
import { JwtPayload } from '@hxfood/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private prisma: PrismaService,
    private cls: ClsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // 检查用户是否仍然活跃
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.status === 'disabled') {
      throw new UnauthorizedException('User disabled');
    }

    // 注入品牌上下文到 CLS
    if (payload.brands.length > 0) {
      this.cls.set('brandId', payload.brands[0]);
    }
    this.cls.set('userId', payload.sub);
    this.cls.set('orgId', payload.orgId);

    return payload;
  }
}
```

- [ ] **Step 5: 创建 AuthService**

```typescript
// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtPayload, TokenResponse, UserProfile } from '@hxfood/shared-types';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private cls: ClsService,
  ) {}

  async login(username: string, password: string, brandId?: string): Promise<TokenResponse> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash!);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens(user.id, brandId);
  }

  async wechatLogin(code: string, brandId?: string): Promise<TokenResponse> {
    // TODO Phase 2: 实际对接微信 code2session
    // Phase 1: 使用 mock，创建或查找 openid=code 的用户
    let user = await this.prisma.user.findFirst({ where: { openid: code } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { openid: code, realName: `微信用户_${code.substring(0, 8)}`, status: 'active' },
      });
    }
    return this.generateTokens(user.id, brandId);
  }

  async refresh(refreshToken: string): Promise<TokenResponse> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      });
      return this.generateTokens(payload.sub, payload.brands[0]);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userOrgRoles: {
          include: {
            role: { include: { rolePermissions: { include: { permission: true } } } },
            org: { include: { brand: true } },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const orgs = user.userOrgRoles.map((uor) => ({
      id: uor.org.id,
      name: uor.org.name,
      orgType: uor.org.orgType,
      brandId: uor.org.brandId,
      brandName: uor.org.brand.name,
      roles: [uor.role.code],
      permissions: uor.role.rolePermissions.map((rp) => rp.permission.code),
    }));

    return {
      id: user.id,
      username: user.username || '',
      realName: user.realName || '',
      phone: user.phone || '',
      avatar: user.avatar || '',
      orgs,
      currentOrg: orgs[0],
    };
  }

  private async generateTokens(userId: string, brandId?: string): Promise<TokenResponse> {
    // 查用户关联的组织和权限
    const userOrgs = await this.prisma.userOrgRole.findMany({
      where: { userId },
      include: {
        org: true,
        role: { include: { rolePermissions: { include: { permission: true } } } },
      },
    });

    if (userOrgs.length === 0) {
      throw new UnauthorizedException('User has no organization');
    }

    // 如果指定了 brandId，筛选该品牌下的组织
    let activeOrgs = userOrgs;
    if (brandId) {
      activeOrgs = userOrgs.filter((uor) => uor.org.brandId === brandId);
      if (activeOrgs.length === 0) {
        throw new UnauthorizedException('User has no access to this brand');
      }
    }

    const defaultOrg = activeOrgs.find((u) => u.isDefault) || activeOrgs[0];
    const brands = [...new Set(activeOrgs.map((u) => u.org.brandId))];
    const roles = activeOrgs.map((u) => u.role.code);
    const permissions = [...new Set(activeOrgs.flatMap((u) =>
      u.role.rolePermissions.map((rp) => rp.permission.code)
    ))];

    const payload: JwtPayload = {
      sub: userId,
      orgId: defaultOrg.org.id,
      orgType: defaultOrg.org.orgType,
      brands,
      roles,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '2h' });
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      expiresIn: '7d',
    });

    return { accessToken, refreshToken, expiresIn: 7200 };
  }
}
```

- [ ] **Step 6: 创建 AuthController**

```typescript
// src/modules/auth/auth.controller.ts
import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from '../../common/decorators/public';
import { CurrentUser } from '../../common/decorators/current-user';
import { JwtPayload, TokenResponse, UserProfile } from '@hxfood/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<TokenResponse> {
    return this.authService.login(dto.username, dto.password, dto.brandId);
  }

  @Public()
  @Post('wechat-login')
  async wechatLogin(@Body() dto: WechatLoginDto): Promise<TokenResponse> {
    return this.authService.wechatLogin(dto.code, dto.brandId);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto): Promise<TokenResponse> {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: JwtPayload): Promise<UserProfile> {
    return this.authService.getProfile(user.sub);
  }
}
```

- [ ] **Step 7: 创建装饰器**

```typescript
// src/common/decorators/current-user.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

```typescript
// src/common/decorators/public.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

- [ ] **Step 8: 创建 JWT Auth Guard（全局守卫，支持 @Public()）**

```typescript
// src/common/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

- [ ] **Step 9: 创建 AuthModule**

```typescript
// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: '2h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 10: 更新 AppModule 注册 Auth 和全局守卫**

```typescript
// src/app.module.ts (更新版)
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ClsModule } from './common/cls/cls.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [ClsModule, PrismaModule, AuthModule],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
```

- [ ] **Step 11: 编译并启动服务器验证**

```bash
cd D:/hxfood/apps/server && pnpm run build
pnpm run start
```

用 curl 测试：

```bash
# 登录
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"test123"}'

# Expected: {"accessToken":"...","refreshToken":"...","expiresIn":7200}

# 获取信息
curl http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer <accessToken>"

# Expected: {"id":"...","username":"admin","orgs":[...],...}
```

**产出:** 账号密码登录和微信登录（mock）均可获得 JWT Token，profile 接口返回完整的组织+权限信息。

---

### Task 7: 实现 RBAC 权限守卫

**角色分配:** 程序员（后端）

**文件:**
- Create: `apps/server/src/common/decorators/require-permission.ts`
- Create: `apps/server/src/common/guards/rbac.guard.ts`
- Create: `apps/server/src/modules/rbac/rbac.module.ts`
- Create: `apps/server/src/modules/rbac/rbac.service.ts`
- Create: `apps/server/src/modules/rbac/rbac.controller.ts`

- [ ] **Step 1: 创建权限装饰器**

```typescript
// src/common/decorators/require-permission.ts
import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permissions);
```

- [ ] **Step 2: 创建 RBAC Guard**

```typescript
// src/common/guards/rbac.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission';
import { IS_PUBLIC_KEY } from '../decorators/public';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.permissions) {
      throw new ForbiddenException('No permissions found');
    }

    // 超级管理员拥有 *:* 权限
    if (user.permissions.includes('*:*')) return true;

    const hasPermission = requiredPermissions.some((rp) =>
      user.permissions.includes(rp)
    );

    if (!hasPermission) {
      throw new ForbiddenException(`Missing permission: ${requiredPermissions.join(', ')}`);
    }

    return true;
  }
}
```

- [ ] **Step 3: 创建 RBAC Service**

```typescript
// src/modules/rbac/rbac.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RoleVo } from '@hxfood/shared-types';

@Injectable()
export class RbacService {
  constructor(private prisma: PrismaService) {}

  async getRoles(brandId?: string): Promise<RoleVo[]> {
    const roles = await this.prisma.role.findMany({
      where: brandId ? { OR: [{ brandId }, { brandId: null }] } : {},
      include: {
        rolePermissions: { include: { permission: true } },
      },
    });
    return roles.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      brandId: r.brandId,
      permissions: r.rolePermissions.map((rp) => ({
        code: rp.permission.code,
        resource: rp.permission.resource,
        action: rp.permission.action,
        description: rp.permission.description,
      })),
    }));
  }

  async getUserPermissions(userId: string, brandId: string): Promise<string[]> {
    const userOrgs = await this.prisma.userOrgRole.findMany({
      where: { userId, org: { brandId } },
      include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
    });
    const permissions = new Set<string>();
    for (const uor of userOrgs) {
      for (const rp of uor.role.rolePermissions) {
        permissions.add(rp.permission.code);
      }
    }
    return [...permissions];
  }
}
```

- [ ] **Step 4: 创建 RBAC Controller（管理后台用）**

```typescript
// src/modules/rbac/rbac.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RequirePermission } from '../../common/decorators/require-permission';
import { RoleVo } from '@hxfood/shared-types';

@Controller('rbac')
export class RbacController {
  constructor(private rbacService: RbacService) {}

  @Get('roles')
  @RequirePermission('*:*') // 仅超管可查看全部角色
  async getRoles(): Promise<RoleVo[]> {
    return this.rbacService.getRoles();
  }
}
```

- [ ] **Step 5: 创建 RBAC Module**

```typescript
// src/modules/rbac/rbac.module.ts
import { Module } from '@nestjs/common';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';

@Module({
  controllers: [RbacController],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
```

- [ ] **Step 6: 注册到 AppModule，配置守卫链**

```typescript
// src/app.module.ts (更新版)
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ClsModule } from './common/cls/cls.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RbacGuard } from './common/guards/rbac.guard';

@Module({
  imports: [ClsModule, PrismaModule, AuthModule, RbacModule],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },   // 第一关: 认证
    { provide: APP_GUARD, useClass: RbacGuard },       // 第二关: 授权
  ],
})
export class AppModule {}
```

- [ ] **Step 7: 验证权限守卫**

```bash
# store01 没有 *:* 权限，访问 /rbac/roles 应该被拒绝
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"store01","password":"test123"}'

# 用 store01 的 token 访问
curl http://localhost:3000/api/v1/rbac/roles \
  -H "Authorization: Bearer <store01_token>"

# Expected: 403 Forbidden

# admin 有 *:* 权限
curl http://localhost:3000/api/v1/rbac/roles \
  -H "Authorization: Bearer <admin_token>"

# Expected: 200 OK, 角色列表
```

**产出:** RBAC 守卫生效，非授权用户访问受保护接口返回 403。

---

### Task 8: 实现品牌隔离中间件

**角色分配:** 程序员（后端）

**文件:**
- Create: `apps/server/src/common/decorators/brand-context.ts`
- Create: `apps/server/src/common/guards/brand.guard.ts`
- Create: `apps/server/src/common/interceptors/brand-context.interceptor.ts`
- Create: `apps/server/src/common/prisma/prisma-brand.extension.ts`
- Modify: `apps/server/src/app.module.ts`（注册拦截器）

- [ ] **Step 1: 创建品牌上下文装饰器**

```typescript
// src/common/decorators/brand-context.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const BrandContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return {
      brandId: request.brandId,
      userId: request.user?.sub,
      orgId: request.user?.orgId,
    };
  },
);
```

- [ ] **Step 2: 创建 Brand Guard**

```typescript
// src/common/guards/brand.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public';

@Injectable()
export class BrandGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return true;

    const brandId = request.headers['x-brand-id'] || user.brands?.[0];
    if (!brandId) return true; // 无品牌上下文的接口

    if (!user.brands?.includes(brandId)) {
      throw new ForbiddenException(`No access to brand: ${brandId}`);
    }

    request.brandId = brandId;
    return true;
  }
}
```

- [ ] **Step 3: 创建品牌上下文拦截器**

```typescript
// src/common/interceptors/brand-context.interceptor.ts
import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Observable } from 'rxjs';

@Injectable()
export class BrandContextInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user) {
      const brandId = request.brandId || user.brands?.[0];
      if (brandId) {
        this.cls.set('brandId', brandId);
        this.cls.set('userId', user.sub);
        this.cls.set('orgId', user.orgId);
      }
    }

    return next.handle();
  }
}
```

- [ ] **Step 4: 创建 Prisma 品牌隔离扩展（核心）**

```typescript
// src/common/prisma/prisma-brand.extension.ts
import { Prisma } from '@prisma/client';
import { ClsService } from 'nestjs-cls';

// 不需要品牌隔离的公共表
const PUBLIC_MODELS = ['Brand', 'User', 'Role', 'Permission', 'RolePermission'];

export const brandIsolationExtension = (cls: ClsService) =>
  Prisma.defineExtension({
    name: 'brandIsolation',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          const brandId = cls.get('brandId');

          if (PUBLIC_MODELS.includes(model) || !brandId) {
            return query(args);
          }

          switch (operation) {
            case 'findUnique':
            case 'findFirst':
            case 'findMany':
            case 'count':
            case 'findUniqueOrThrow':
            case 'findFirstOrThrow':
              args.where = { ...args.where, brandId };
              break;

            case 'create':
              args.data = { ...args.data, brandId };
              break;

            case 'createMany':
              if (Array.isArray(args.data)) {
                args.data = args.data.map((d: any) => ({ ...d, brandId }));
              } else {
                args.data = { ...args.data, brandId };
              }
              break;

            case 'update':
            case 'delete':
            case 'updateMany':
            case 'deleteMany':
            case 'upsert':
              args.where = { ...args.where, brandId };
              break;
          }

          return query(args);
        },
      },
    },
  });
```

- [ ] **Step 5: 扩展 PrismaService 使用品牌隔离**

```typescript
// src/common/prisma/prisma.service.ts (更新版)
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { brandIsolationExtension } from './prisma-brand.extension';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private cls: ClsService) {
    super();
  }

  async onModuleInit() {
    // 动态绑定扩展
    const extended = this.$extends(brandIsolationExtension(this.cls)) as unknown as this;
    // 替换自身（保持单例引用不变，后续注入者自动使用扩展版）
    Object.setPrototypeOf(this, Object.getPrototypeOf(extended));
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 6: 更新 AppModule 注册拦截器**

```typescript
// src/app.module.ts (最终版)
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ClsModule } from './common/cls/cls.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RbacGuard } from './common/guards/rbac.guard';
import { BrandGuard } from './common/guards/brand.guard';
import { BrandContextInterceptor } from './common/interceptors/brand-context.interceptor';

@Module({
  imports: [ClsModule, PrismaModule, AuthModule, RbacModule],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: BrandGuard },
    { provide: APP_GUARD, useClass: RbacGuard },
    { provide: APP_INTERCEPTOR, useClass: BrandContextInterceptor },
  ],
})
export class AppModule {}
```

**产出:** 品牌隔离三层防护就绪，所有业务表查询自动注入 brand_id。

---

### Task 9: Phase 1 集成测试

**角色分配:** 程序员（后端）

**文件:**
- Create: `apps/server/test/auth.e2e-spec.ts`
- Create: `apps/server/test/rbac.e2e-spec.ts`
- Create: `apps/server/test/brand-isolation.e2e-spec.ts`
- Create: `apps/server/test/jest-e2e.json`

- [ ] **Step 1: 创建 E2E 测试配置**

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "moduleNameMapper": {
    "^@hxfood/shared-types$": "<rootDir>/../../packages/shared-types/src",
    "^@hxfood/shared-utils$": "<rootDir>/../../packages/shared-utils/src"
  }
}
```

- [ ] **Step 2: 认证 E2E 测试**

```typescript
// test/auth.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/auth/login — should return tokens for valid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'test123' })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.expiresIn).toBe(7200);
  });

  it('POST /api/v1/auth/login — should reject invalid password', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'wrong' })
      .expect(401);
  });

  it('GET /api/v1/auth/profile — should return user profile with valid token', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'test123' });

    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(200);

    expect(res.body.id).toBeDefined();
    expect(res.body.orgs.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/auth/profile — should reject without token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .expect(401);
  });
});
```

- [ ] **Step 3: RBAC E2E 测试**

```typescript
// test/rbac.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('RBAC (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let storeToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // 获取两个测试用户的 token
    const adminRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'test123' });
    adminToken = adminRes.body.accessToken;

    const storeRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'store01', password: 'test123' });
    storeToken = storeRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/rbac/roles — admin (*:*) can access', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/rbac/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/rbac/roles — store (no *:*) gets 403', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/rbac/roles')
      .set('Authorization', `Bearer ${storeToken}`)
      .expect(403);
  });
});
```

- [ ] **Step 4: 品牌隔离 E2E 测试**

```typescript
// test/brand-isolation.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Brand Isolation (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'test123' });
    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should enforce brand isolation: orders query respects brand_id', async () => {
    // 默认从 JWT 推断品牌上下文（admin 的默认组织属于品牌A）
    const res = await request(app.getHttpServer())
      .get('/api/v1/rbac/roles') // 使用已有接口
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toBeDefined();
  });

  it('should allow switching brand via X-Brand-Id header', async () => {
    // admin 属于品牌A (WYZJ)，切换到不存在的品牌应被拒绝
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Brand-Id', '00000000-0000-0000-0000-000000000000')
      .expect(403);

    // 403 表示品牌守卫拦截成功
    expect(res.body.message).toContain('No access to brand');
  });
});
```

- [ ] **Step 5: 运行全部 E2E 测试**

```bash
cd D:/hxfood/apps/server && pnpm run test:e2e
```

Expected: 8-10 个测试用例全部 PASS。

---

### Task 10: Phase 1 验收 — 总架构师 & QA 联合评审

**角色分配:** 总架构师（验收）+ 测试验收员（评审）

**验收清单:**

| # | 验收项 | 标准 | 方法 |
|---|--------|------|------|
| 1 | monorepo 编译 | `pnpm run build` 全量通过 | 运行命令 |
| 2 | shared-utils 测试 | 10 个用例 PASS | 运行 `pnpm run test` |
| 3 | Docker 环境 | PostgreSQL + Redis 正常运行 | `docker compose ps` |
| 4 | Prisma 迁移 | 所有表创建完毕 | `prisma db push --dry-run` 无差异 |
| 5 | 种子数据 | admin / store01 可登录 | E2E 测试验证 |
| 6 | JWT 认证 | 登录返回 token，profile 可获取 | E2E 测试验证 |
| 7 | RBAC 权限 | store01 无法访问超管接口 | E2E 测试验证 |
| 8 | 品牌隔离 | 切换无权限品牌返回 403 | E2E 测试验证 |
| 9 | 金额工具 | 元↔分转换精确，乘法整数运算 | 单元测试验证 |
| 10 | E2E 全量 | 8+ 个 E2E 用例全部 PASS | `pnpm run test:e2e` |

**评审流程:**

1. **总架构师先验收**: 运行所有测试，检查代码结构和文件完整性
2. **总架构师通过后，将验收清单交给测试员**
3. **测试员独立验证**: 运行测试、检查测试覆盖率、尝试边界条件
4. **双方在每项验收标准上达成一致**
5. **全部通过后，Phase 1 关闭，开始 Phase 2**

---

## Phase 1 完成标志

```
✅ monorepo 骨架（pnpm + turbo）
✅ 共享类型包 (@hxfood/shared-types)
✅ 共享工具包 (@hxfood/shared-utils) + 测试
✅ Prisma Schema（全部模型 + 索引 + 关系）
✅ Docker 开发环境
✅ 种子数据
✅ JWT 双 Token 认证
✅ RBAC 权限守卫
✅ 品牌隔离三层防护
✅ E2E 测试全部通过
✅ 总架构师 + QA 联合验收通过
```
