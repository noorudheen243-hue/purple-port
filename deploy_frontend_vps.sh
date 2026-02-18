#!/bin/bash

# Deployment Script for AntiGravity Frontend Update
# Usage: ./deploy_frontend_vps.sh

# Exit on any error
set -e

# 0. Safety Check
if [ ! -d "client" ] || [ ! -d "server" ]; then
    echo "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    echo "ERROR: Wrong Directory!"
    echo "You must run this script from the PROJECT ROOT."
    echo "We are looking for 'client' and 'server' folders here."
    echo "Current Location: $(pwd)"
    echo "Try: cd /var/www/purple-port"
    echo "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    exit 1
fi

echo ">>> Starting Frontend Update Deployment..."

# 1. Pull Latest Code
echo ">>> Pulling latest changes from git..."
git fetch origin main
git reset --hard origin/main
echo ">>> Git updated to commit: $(git rev-parse HEAD)"

# 2. Build Frontend
echo ">>> Building React Frontend..."
cd client
npm install
npm run build

if [ ! -d "dist" ]; then
    echo ">>> ERROR: Frontend build failed. 'dist' directory not found."
    exit 1
fi

echo ">>> Frontend Build Successful."

# 3. Deploy to Backend Public Folder
echo ">>> Deploying to Server Public Directory..."
# Ensure target exists
mkdir -p ../server/public

# Clear old files
rm -rf ../server/public/*

# Copy new files
cp -r dist/* ../server/public/

echo ">>> Files copied successfully."

# 4. Restart Backend (to ensure API changes are picked up)
echo ">>> Restarting Backend Server..."
cd ../server
npm install
npx prisma generate
pm2 restart all

echo ">>> Deployment Complete! Please hard refresh your browser."
