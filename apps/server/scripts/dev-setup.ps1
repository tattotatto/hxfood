# hxfood - dev environment setup (Windows PowerShell)
# Prerequisites: docker, docker-compose, Node.js >=20, pnpm

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerDir = Split-Path -Parent $ScriptDir

Write-Host "==> Starting Docker services..." -ForegroundColor Cyan
Push-Location $ServerDir
docker-compose up -d

Write-Host "==> Waiting for PostgreSQL to become healthy..." -ForegroundColor Cyan
do {
    Write-Host "    waiting for postgres..."
    Start-Sleep -Seconds 2
    $pgReady = docker-compose exec -T postgres pg_isready -U hxfood -d hxfood 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { $pgReady = "" }
} while ($pgReady -notmatch "accepting connections")
Write-Host "    PostgreSQL is ready." -ForegroundColor Green

Write-Host "==> Waiting for Redis to become healthy..." -ForegroundColor Cyan
do {
    Write-Host "    waiting for redis..."
    Start-Sleep -Seconds 1
    $redisReady = docker-compose exec -T redis redis-cli ping 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { $redisReady = "" }
} while ($redisReady -notmatch "PONG")
Write-Host "    Redis is ready." -ForegroundColor Green

Write-Host "==> Running Prisma migrations..." -ForegroundColor Cyan
npx prisma migrate deploy

Write-Host "==> Seeding database..." -ForegroundColor Cyan
npx ts-node prisma/seed.ts

Pop-Location

Write-Host ""
Write-Host "=== Dev environment is ready! ===" -ForegroundColor Green
Write-Host "PostgreSQL: localhost:5432 (hxfood / hxfood / hxfood123)"
Write-Host "Redis:      localhost:6379"
Write-Host ""
Write-Host "Quickstart:"
Write-Host "  pnpm run dev              # Start NestJS dev server"
Write-Host "  npx prisma studio         # Open Prisma Studio"
Write-Host ""
Write-Host "Test accounts (password: test123):"
Write-Host "  admin       -> HQ super admin"
Write-Host "  store01     -> BJ"
Write-Host "  store02     -> SH"
Write-Host "  kitchen01   -> CK admin"
Write-Host "  supplier01  -> supplier"
Write-Host "  storeb01    -> brand B"
