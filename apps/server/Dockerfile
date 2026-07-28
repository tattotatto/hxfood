# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace root config files for dependency resolution
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy all package.json and tsconfig files (needed for pnpm install + resolution)
COPY apps/server/package.json apps/server/tsconfig.json apps/server/nest-cli.json apps/server/
COPY packages/shared-types/package.json packages/shared-types/tsconfig.json packages/shared-types/
COPY packages/shared-utils/package.json packages/shared-utils/tsconfig.json packages/shared-utils/
COPY packages/shared-config/package.json packages/shared-config/
COPY apps/admin-hq/package.json apps/admin-hq/

# Install all dependencies (dev + prod) — only server + admin-hq + shared packages
RUN pnpm install --filter @hxfood/server --filter @hxfood/admin-hq --filter @hxfood/shared-types --filter @hxfood/shared-utils --no-frozen-lockfile

# Copy source code
COPY apps/server/src/ apps/server/src/
COPY apps/server/prisma/ apps/server/prisma/
COPY packages/shared-types/src/ packages/shared-types/src/
COPY packages/shared-utils/src/ packages/shared-utils/src/
COPY packages/shared-config/ packages/shared-config/
COPY apps/admin-hq/src/ apps/admin-hq/src/
COPY apps/admin-hq/index.html apps/admin-hq/vite.config.ts apps/admin-hq/tsconfig.json apps/admin-hq/tailwind.config.js apps/admin-hq/postcss.config.js apps/admin-hq/

# Build workspace packages (compile TypeScript to JavaScript)
RUN pnpm --filter @hxfood/shared-types build
RUN pnpm --filter @hxfood/shared-utils build

# Patch workspace package entry points to compiled output
# (pnpm symlinks resolve to package dir; Node needs main -> dist/index.js at runtime)
RUN node -e "const p=require('./packages/shared-types/package.json');p.main='./dist/index.js';p.types='./dist/index.d.ts';require('fs').writeFileSync('./packages/shared-types/package.json',JSON.stringify(p,null,2)+'\n')"
RUN node -e "const p=require('./packages/shared-utils/package.json');p.main='./dist/index.js';p.types='./dist/index.d.ts';require('fs').writeFileSync('./packages/shared-utils/package.json',JSON.stringify(p,null,2)+'\n')"

# Build the NestJS server
RUN pnpm --filter @hxfood/server build

# Build admin-hq SPA
RUN pnpm --filter @hxfood/admin-hq build

# Stage 2: Production
FROM node:20-alpine AS prod
WORKDIR /app

# Prisma 5.22 engine for musl + OpenSSL 3 (via binaryTargets in schema.prisma)
RUN apk add --no-cache openssl

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN npm install -g tsx

# Copy workspace root config
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY --from=build /app/apps/server/package.json ./apps/server/
COPY --from=build /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=build /app/packages/shared-utils/package.json ./packages/shared-utils/

# Install production dependencies only
RUN pnpm install --filter @hxfood/server --filter @hxfood/shared-types --filter @hxfood/shared-utils --prod --no-frozen-lockfile

# Copy compiled output from build stage
COPY --from=build /app/apps/server/dist/ ./apps/server/dist/
COPY --from=build /app/apps/server/prisma/ ./apps/server/prisma/
COPY --from=build /app/packages/shared-types/dist/ ./packages/shared-types/dist/
COPY --from=build /app/packages/shared-utils/dist/ ./packages/shared-utils/dist/
COPY --from=build /app/apps/admin-hq/dist/ ./apps/admin-hq/

WORKDIR /app/apps/server
EXPOSE 3000

# Generate Prisma client at runtime then start the server
# Pin Prisma CLI to v5.x — v7 drops url = env("DATABASE_URL") support
CMD ["sh", "-c", "npx prisma@5 generate && node dist/main.js"]
