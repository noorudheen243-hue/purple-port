#!/bin/bash
set -e

echo "⚠️  STARTING AGGRESSIVE FORCE UPDATE..."

# 1. Stop everything to release file locks
pm2 stop qix-backend || true
pm2 delete qix-backend || true

# 2. Hard Reset Code
git reset --hard
git pull origin main

# 3. Clean Install Frontend
echo "🧹 Cleaning Frontend..."
cd client
rm -rf node_modules dist package-lock.json
npm install
npm run build
cd ..

# 4. Clean Install Backend
echo "🧹 Cleaning Backend..."
cd server
rm -rf node_modules dist package-lock.json
npm install

echo "🔄 Generating Prisma..."
npx prisma generate --schema=./prisma/schema.prisma

echo "🏗️  Building Server..."
npm run build

# 5. Integration
echo "🔗 Integrating..."
rm -rf public
mkdir -p public
cp -r ../client/dist/* public/

# 6. Start Fresh
echo "🚀 Starting Server..."
# Explicitly use node to start dist/server.js
pm2 start dist/server.js --name qix-backend --update-env

echo "✅ FORCE UPDATE COMPLETE."
