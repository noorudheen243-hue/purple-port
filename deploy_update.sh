#!/bin/bash

# Deployment Script for Sticky Notes Feature
# User: Run this on the VPS (72.61.246.22)

echo ">>> Starting Deployment..."

# 1. Pull Latest Code
echo ">>> Pulling latest changes..."
cd /var/www/purple-port || exit
# Assuming standard path, adjust if needed
git pull origin main

# 2. Update Backend
echo ">>> Updating Server..."
cd server || exit
npm install
# COMPILE TYPESCRIPT (Important!)
npm run build
npx prisma generate
npx prisma db push # Or migrate deploy
# Ensure Developer Admin Role
# Ensure Developer Admin Role
# Force Production Mode for Backend
export NODE_ENV=production

# PM2 RESCUE: Restart ALL possible service names to be safe
echo ">>> Resetting PM2 Processes..."
pm2 restart "purple-port-api" || echo "purple-port-api not running"
pm2 restart "qix-api" || echo "qix-api not running"
pm2 restart "qix-backend" || echo "qix-backend not running"
pm2 save

# SYNC: Also copy code to /root/purple-port just in case
echo ">>> Syncing to fallback directory..."
mkdir -p /root/purple-port
cp -r /var/www/purple-port/* /root/purple-port/ || true

# 3. Update Frontend
echo ">>> Building Client..."
cd ../client || exit
npm install
npm run build

# 4. Copy Build to Public (if served by Express or Nginx root)
# If Nginx serves /client/dist directly, this is done.
# If Express serves it (as per app.ts), we need to ensure it's in the right place.
# Based on app.ts: app.use(express.static(path.join(process.cwd(), 'public')));
# So we need to copy dist to server/public
echo ">>> Deploying Client Build..."
rm -rf ../server/public
cp -r dist ../server/public

# 5. PERMISSIONS & NGINX FIX
# Ensure Nginx (www-data) can read the new files
echo ">>> Fixing Permissions..."
chown -R www-data:www-data /var/www/purple-port
chmod -R 755 /var/www/purple-port

# Restart Nginx to clear cache
echo ">>> Restarting Nginx..."
systemctl restart nginx || echo "Warning: Could not restart Nginx (maybe not installed?)"

echo ">>> Deployment Complete!"
