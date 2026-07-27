#!/usr/bin/env bash
set -euo pipefail

# hxfood — dev environment setup (Unix)
# Prerequisites: docker, docker-compose, Node.js >=20, pnpm

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Starting Docker services..."
cd "$SERVER_DIR"
docker-compose up -d

echo "==> Waiting for PostgreSQL to become healthy..."
until docker-compose exec -T postgres pg_isready -U hxfood -d hxfood > /dev/null 2>&1; do
  echo "    waiting for postgres..."
  sleep 2
done
echo "    PostgreSQL is ready."

echo "==> Waiting for Redis to become healthy..."
until docker-compose exec -T redis redis-cli ping | grep -q PONG; do
  echo "    waiting for redis..."
  sleep 1
done
echo "    Redis is ready."

echo "==> Running Prisma migrations..."
npx prisma migrate deploy

echo "==> Seeding database..."
npx ts-node prisma/seed.ts

echo ""
echo "=== Dev environment is ready! ==="
echo "PostgreSQL: localhost:5432 (hxfood / hxfood / hxfood123)"
echo "Redis:      localhost:6379"
echo ""
echo "Quickstart:"
echo "  pnpm run dev              # Start NestJS dev server"
echo "  npx prisma studio         # Open Prisma Studio"
echo ""
echo "Test accounts (password: test123):"
echo "  admin       → 系统管理员 (HQ super admin)"
echo "  store01     → 北京朝阳店长"
echo "  store02     → 上海浦东店长"
echo "  kitchen01   → 中央厨房管理员"
echo "  supplier01  → 供应商联系人"
echo "  storeb01    → 广州天河店长 (brand B)"
