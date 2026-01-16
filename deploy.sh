#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo "=========================================="
echo "🚀 Starting Robust Deployment..."
echo "=========================================="

# 1. Update Codebase
echo "📥 Pulling latest code..."
# Stash local changes to avoid conflicts (except .env usually ignored)
git stash
git pull origin main

# 2. Build Client
echo "🏗️  Building Frontend..."
cd client
echo "   - Installing dependencies..."
npm install
echo "   - Compiling React app..."
npm run build
cd ..

# 3. Build Server
echo "🏗️  Building Backend..."
cd server
echo "   - Installing dependencies..."
npm install
echo "   - Compiling TypeScript..."
npm run build
echo "   - Generating Prisma Client..."
npx prisma generate

# 4. Integrate
echo "🔗 Integration: Copying Client to Server Public folder..."
rm -rf public
mkdir -p public
# Check if build exists
if [ -d "../client/dist" ]; then
    cp -r ../client/dist/* public/
else
    echo "❌ Error: Client build directory 'dist' not found!"
    exit 1
fi

# 5. Restart Application
echo "🔄 Restarting Server..."
pm2 restart qix-backend || pm2 start dist/server.js --name qix-backend

echo "=========================================="
echo "✅ Deployment Complete! App is live."
echo "=========================================="
