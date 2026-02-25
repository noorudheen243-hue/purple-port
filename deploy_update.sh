#!/bin/bash

# Deploy Script
set -e # Exit immediately if a command exits with a non-zero status

# Error Handling
trap 'echo "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; echo ">>> ERROR: Deployment Failed! Fix the error above and try again."; echo "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; exit 1' ERR

echo ">>> Starting Deployment (v2.4)..."

# 1. Pull Latest Code
echo ">>> Pulling latest changes..."
cd /var/www/purple-port || exit
git pull origin main

# 2. Fix permissions FIRST (previous deploy may have stripped exec bits)
echo ">>> Restoring execute permissions on node_modules/.bin..."
[ -d client/node_modules/.bin ] && chmod +x client/node_modules/.bin/* 2>/dev/null || true
[ -d server/node_modules/.bin ] && chmod +x server/node_modules/.bin/* 2>/dev/null || true

# 3. Update Frontend (Build while server is running to minimize downtime)
echo ">>> Building Client..."
cd client || exit
export NODE_ENV=development
npm install
# Restore exec perms after npm install (install may reset them)
chmod +x node_modules/.bin/* 2>/dev/null || true
npm run build
cd ..

# 4. Update Backend
echo ">>> Updating Server..."
cd server || exit
npm install
chmod +x node_modules/.bin/* 2>/dev/null || true
# CLEAN & BUILD
echo ">>> Cleaning old build artifacts..."
rm -rf dist
echo ">>> Compiling TypeScript..."
npm run build
npx prisma generate
npx prisma db push 

# Force Production Mode
export NODE_ENV=production

# 5. PM2 RELOAD (Aggressive Stop/Start)
echo ">>> Restarting PM2..."
# Stop everything to ensure no locked files
pm2 stop all || true
pm2 delete "qix-api" || true
pm2 delete "purple-port-api" || true
pm2 delete "qix-ads" || true

# Start Clean Instance
pm2 start dist/server.js --name "qix-api"
pm2 save

# 6. Deploy Client Build (Now safe as old server processes are stopped/restarted)
# Ensure Target Directory Exists
echo ">>> Deploying Client Build..."
mkdir -p public
rm -rf public/*
# Copy from sibling client/dist to server/public
cp -r ../client/dist/* public/

# 7. PERMISSIONS & NGINX FIX
# Ensure Nginx (www-data) can read the new files
echo ">>> Fixing Permissions..."
chown -R www-data:www-data /var/www/purple-port
chmod -R 755 /var/www/purple-port

# Restore execute permissions for node_modules binaries after chown
chmod +x /var/www/purple-port/client/node_modules/.bin/* 2>/dev/null || true
chmod +x /var/www/purple-port/server/node_modules/.bin/* 2>/dev/null || true

# Restart Nginx to clear cache
echo ">>> Restarting Nginx..."
systemctl restart nginx || echo "Warning: Could not restart Nginx (maybe not installed?)"

echo ">>> Deployment Complete!"
