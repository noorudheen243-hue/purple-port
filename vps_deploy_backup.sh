#!/bin/bash
set -e
export PATH=$PATH:/usr/local/bin:/usr/bin:/usr/sbin:/sbin
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"

echo "-> Extracting to /var/www/antigravity..."
unzip -o -q /var/www/backup_feature_update.zip -d /var/www/antigravity

if [ -d /var/www/purple-port ]; then
  echo "-> Also extracting to /var/www/purple-port..."
  unzip -o -q /var/www/backup_feature_update.zip -d /var/www/purple-port
fi

echo "-> Installing npm deps..."
cd /var/www/antigravity
npm install --production --no-audit --silent

echo "-> Creating backup storage dir..."
mkdir -p /var/backups/antigravity
chmod 755 /var/backups/antigravity

echo "-> Updating .env files..."
for ENV_FILE in /var/www/antigravity/.env /var/www/purple-port/.env; do
  if [ -f "$ENV_FILE" ]; then
    grep -q "BACKUP_DIR" "$ENV_FILE" || echo "BACKUP_DIR=/var/backups/antigravity" >> "$ENV_FILE"
    grep -q "AUTO_BACKUP_ENABLED" "$ENV_FILE" || echo "AUTO_BACKUP_ENABLED=true" >> "$ENV_FILE"
    echo "   Updated: $ENV_FILE"
  fi
done

echo "-> Restarting with PM2..."
pm2 restart all

echo ""
echo "SUCCESS: Backup feature deployed!"
echo "Test at: https://www.qixport.com/dashboard/settings"
