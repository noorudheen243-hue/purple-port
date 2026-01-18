#!/bin/bash

# Qix Ads Deployment Script
# Place this file in /root/purple-port/ on your VPS
# Make it executable with: chmod +x deploy.sh
# Run it with: ./deploy.sh

echo "========================================"
echo "🚀 Qix Ads Automated Deployment System"
echo "========================================"

# Stop on any error
set -e

# 1. Update Codebase
echo "⬇️  Step 1: Pulling latest code from Git..."
git pull origin main

# 2. Server Update
echo "🛠️  Step 2: Updating Server..."
cd server
echo "   -> Installing dependencies..."
npm install --production=false # Ensure devDependencies (types/prisma) are installed for build
echo "   -> Generating Database Client..."
npx prisma generate
echo "   -> Pushing Database Schema..."
npx prisma db push
echo "   -> Compiling TypeScript..."
npm run build
cd ..

# 3. Client Update
echo "🎨 Step 3: Updating Client..."
cd client
echo "   -> Installing dependencies..."
npm install
echo "   -> Building React App..."
npm run build
cd ..

# 4. Restart Services
echo "🔄 Step 4: Restarting Process Manager..."
pm2 restart all

echo "========================================"
echo "✅ DEPLOYMENT SUCCESSFUL"
echo "========================================"
