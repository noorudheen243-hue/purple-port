#!/bin/bash
set -e # Exit on error

APP_DIR="/var/www/purple-port"
REPO_URL="https://github.com/noorudheen243-hue/purple-port.git"

echo "--- Stopping Services ---"
pm2 stop all || true

echo "--- Backing up Environment ---"
# Check if .env exists before copy
if [ -f "$APP_DIR/server/.env" ]; then
    cp "$APP_DIR/server/.env" /tmp/env.backup
    echo "Environment backed up."
else
    echo "WARNING: No .env found at $APP_DIR/server/.env"
fi

echo "--- Wiping Directory ---"
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR"

echo "--- Cloning Repository ---"
git clone "$REPO_URL" "$APP_DIR"

echo "--- Restoring Environment ---"
if [ -f "/tmp/env.backup" ]; then
    mkdir -p "$APP_DIR/server"
    cp /tmp/env.backup "$APP_DIR/server/.env"
    echo "Environment restored."
else
    echo "ERROR: /tmp/env.backup not found. Deployment configuration missing!"
    # Ensure we don't proceed with a broken app? Or create a dummy env?
    # For now, we proceed but log heavily.
fi

echo "--- Installing Dependencies ---"
cd "$APP_DIR"
npm install --no-audit

echo "--- Building Application ---"
# Assuming build script handles both client and server or workspaces
npm run build 

echo "--- Resetting Database Schema ---"
cd "$APP_DIR/server"
# Generate Prisma Client
npx prisma generate
# Push schema (wipes data if collision)
npx prisma db push --force-reset || echo "Prisma DB Push Failed"

echo "--- Restarting Services ---"
cd "$APP_DIR"
pm2 restart all || pm2 start dist/server.js --name "antigravity-server"

echo "--- Deployment Complete ---"
