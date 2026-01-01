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
npx prisma generate
npx prisma db push # Or migrate deploy
pm2 restart all # Restart backend

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

echo ">>> Deployment Complete!"
