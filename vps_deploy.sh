#!/bin/bash

# Purple Port VPS Deployment Script
# Usage: ./vps_deploy.sh

echo "----------------------------------------"
echo "🚀 Starting Purple Port Deployment"
echo "----------------------------------------"

# 1. Update Code from GitHub
echo "📥 Pulling latest code..."
git pull origin main

# 2. Build Server
echo "🛠️ Building Server..."
cd server
npm install
npx prisma generate
npm run build

# 3. Build Client
echo "🎨 Building Client..."
cd ../client
rm -rf dist
npm install
# Set memory limit to avoid crash on small VPS
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# 4. Fix Permissions
echo "🔒 Fixing Permissions..."
cd ..
chown -R www-data:www-data client/dist
chmod -R 755 client/dist

# 5. Restart Services
echo "🔄 Restarting Services..."
pm2 restart all
systemctl restart nginx

echo "----------------------------------------"
echo "✅ Deployment Complete!"
echo "----------------------------------------"
