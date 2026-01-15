#!/bin/bash
set -e # Exit on error

# Configuration
PROJECT_DIR="/root/Antigravity/server"
CLIENT_DIR="/root/Antigravity/client"

echo "============================================="
echo "   STARTING FRESH DEPLOYMENT - QIX ADS   "
echo "============================================="

echo "[1/6] Stopping Services..."
pm2 delete all || true

echo "[2/6] Backing up Environment..."
# Assuming .env exists in server root
if [ -f "$PROJECT_DIR/.env" ]; then
  cp "$PROJECT_DIR/.env" /root/env.backup
  echo "Backup saved to /root/env.backup"
else
  echo "WARNING: No .env found at $PROJECT_DIR/.env! You may need to create it manually."
fi

echo "[3/6] Refreshing Codebase..."
# Navigate to Repo Root (Parent of server/client)
cd "$PROJECT_DIR/.."
git fetch origin
git reset --hard origin/main
git clean -fd # Remove untracked files (Clean slate)

# Restore Env
if [ -f /root/env.backup ]; then
  mv /root/env.backup "$PROJECT_DIR/.env"
  echo "Environment file restored."
fi

echo "[4/6] Backend: Resetting Database & Building..."
cd "$PROJECT_DIR"
echo "Installing Backend Dependencies..."
npm install
echo "Wiping Database..."
rm -f prisma/dev.db 
echo "Running Migrations..."
npx prisma migrate deploy 
echo "Seeding Users (Admin/Staff only)..."
npx prisma db seed 
echo "Building Backend..."
npm run build

echo "[5/6] Frontend: Building..."
cd "$CLIENT_DIR"
echo "Installing Frontend Dependencies..."
npm install
echo "Building Frontend..."
npm run build

# Nginx Handling (Optional - Adjust if you use Nginx)
# cp -r dist/* /var/www/html/ 

echo "[6/6] Restarting Services..."
cd "$PROJECT_DIR"
pm2 start dist/server.js --name "qix-backend"
pm2 save

echo "============================================="
echo "   ✅ FRESH DEPLOYMENT COMPLETE!   "
echo "============================================="
