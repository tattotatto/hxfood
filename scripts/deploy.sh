#!/bin/bash
set -e

echo "Deploying hxfood..."

# Pull latest code
git pull origin master

# Copy production env file
cp .env.production .env

# Build the server image
docker compose -f docker-compose.prod.yml build server

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Run database migrations
docker compose -f docker-compose.prod.yml exec -T server npx prisma migrate deploy

echo "Deploy complete!"
