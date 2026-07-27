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

# Install all dependencies (dev + prod) for build
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/server/src/ apps/server/src/
COPY apps/server/prisma/ apps/server/prisma/
COPY packages/shared-types/src/ packages/shared-types/src/
COPY packages/shared-utils/src/ packages/shared-utils/src/
COPY packages/shared-config/ packages/shared-config/

# Build workspace packages (compile TypeScript to JavaScript)
RUN pnpm --filter @hxfood/shared-types build
RUN pnpm --filter @hxfood/shared-utils build

# Patch workspace package entry points to compiled output
# (pnpm symlinks resolve to package dir; Node needs main -> dist/index.js at runtime)
RUN node -e "const p=require('./packages/shared-types/package.json');p.main='./dist/index.js';p.types='./dist/index.d.ts';require('fs').writeFileSync('./packages/shared-types/package.json',JSON.stringify(p,null,2)+'\n')"
RUN node -e "const p=require('./packages/shared-utils/package.json');p.main='./dist/index.js';p.types='./dist/index.d.ts';require('fs').writeFileSync('./packages/shared-utils/package.json',JSON.stringify(p,null,2)+'\n')"

# Build the NestJS server
RUN pnpm --filter @hxfood/server build

# Stage 2: Production
FROM node:20-alpine AS prod
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace root config
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy package.json files with patched entry points from build stage
COPY --from=build /app/apps/server/package.json ./apps/server/
COPY --from=build /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=build /app/packages/shared-utils/package.json ./packages/shared-utils/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy compiled output from build stage
COPY --from=build /app/apps/server/dist/ ./apps/server/dist/
COPY --from=build /app/apps/server/prisma/ ./apps/server/prisma/
COPY --from=build /app/packages/shared-types/dist/ ./packages/shared-types/dist/
COPY --from=build /app/packages/shared-utils/dist/ ./packages/shared-utils/dist/

WORKDIR /app/apps/server
EXPOSE 3000

# Generate Prisma client at runtime then start the server
CMD ["sh", "-c", "npx prisma generate && node dist/main.js"]
