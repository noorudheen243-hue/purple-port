#!/bin/bash
set -e

APP_DIR="/var/www/purple-port"
BACKUP_DIR="$HOME/server_backup_$(date +%s)"
REPO_URL="https://github.com/noorudheen243-hue/purple-port.git"

echo "Starting fresh deployment..."

# 1. Backup .env
if [ -f "$APP_DIR/server/.env" ]; then
    echo "Backing up .env to $BACKUP_DIR..."
    mkdir -p "$BACKUP_DIR"
    cp "$APP_DIR/server/.env" "$BACKUP_DIR/.env"
else
    echo "Warning: No .env found at $APP_DIR/server/.env. Proceeding without backup."
fi

# 2. Stop Application
echo "Stopping application..."
pm2 delete all || true

# 3. Remove old application
echo "Removing old application..."
rm -rf "$APP_DIR"

# 4. Clone new application
echo "Cloning new application..."
mkdir -p "$APP_DIR"
git clone "$REPO_URL" "$APP_DIR"

# 5. Restore .env
echo "Restoring .env..."
if [ -f "$BACKUP_DIR/.env" ]; then
    cp "$BACKUP_DIR/.env" "$APP_DIR/server/.env"
else
    echo "Error: No .env backup found to restore. You will need to create it manually."
    # Create empty .env to avoid build errors if it depends on it, or just warn
    touch "$APP_DIR/server/.env"
fi

# 6. Install Dependencies & Build
echo "Installing dependencies and building..."
cd "$APP_DIR/server"
npm install
npx prisma generate
npm run build
# Optional: push db changes
# npx prisma db push

# 7. Start Application
echo "Starting application with PM2..."
pm2 start dist/server.js --name "purple-port-server"
pm2 save

echo "Deployment complete!"
