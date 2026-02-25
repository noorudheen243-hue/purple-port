#!/bin/bash

# Deploy Script v2.5 — FIXED ORDER: copy files BEFORE pm2 restart
set -e

trap 'echo "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; echo ">>> ERROR: Deployment Failed! Fix the error above and try again."; echo "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; exit 1' ERR

echo ">>> Starting Deployment (v2.5)..."

ROOT=/var/www/purple-port

# 1. Pull Latest Code
echo ">>> Pulling latest changes..."
cd "$ROOT" || exit
git pull origin main

# 2. Fix permissions FIRST (previous deploy may have stripped exec bits)
echo ">>> Restoring execute permissions on node_modules/.bin..."
[ -d "$ROOT/client/node_modules/.bin" ] && chmod +x "$ROOT/client/node_modules/.bin/"* 2>/dev/null || true
[ -d "$ROOT/server/node_modules/.bin" ] && chmod +x "$ROOT/server/node_modules/.bin/"* 2>/dev/null || true

# 3. Build Frontend
echo ">>> Building Client..."
cd "$ROOT/client" || exit
npm install --legacy-peer-deps
chmod +x node_modules/.bin/* 2>/dev/null || true
npm run build

# 4. Deploy Client Build to server/public (BEFORE pm2 restart)
echo ">>> Deploying Client Build to server/public..."
mkdir -p "$ROOT/server/public"
rm -rf "$ROOT/server/public"/*
cp -r "$ROOT/client/dist/"* "$ROOT/server/public/"
echo ">>> Client files deployed successfully."

# 5. Build Backend
echo ">>> Updating Server..."
cd "$ROOT/server" || exit
npm install --legacy-peer-deps
chmod +x node_modules/.bin/* 2>/dev/null || true
rm -rf dist
echo ">>> Compiling TypeScript..."
npm run build
npx prisma generate
npx prisma db push

# 6. PM2 Restart (AFTER all files are in place)
echo ">>> Restarting PM2..."
pm2 stop all || true
pm2 delete "qix-api" || true
pm2 delete "purple-port-api" || true
pm2 delete "qix-ads" || true

export NODE_ENV=production
pm2 start dist/server.js --name "qix-api"
pm2 save

# 7. Permissions fix
echo ">>> Fixing Permissions..."
chown -R www-data:www-data "$ROOT"
chmod -R 755 "$ROOT"
# Restore exec bits AFTER chown (chown may strip them)
chmod +x "$ROOT/client/node_modules/.bin/"* 2>/dev/null || true
chmod +x "$ROOT/server/node_modules/.bin/"* 2>/dev/null || true

# 8. Restart Nginx
echo ">>> Restarting Nginx..."
systemctl restart nginx || echo "Warning: Could not restart Nginx"

echo ">>> Deployment Complete! (v2.5)"
