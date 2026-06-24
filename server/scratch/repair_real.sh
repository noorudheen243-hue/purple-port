#!/bin/bash
set -e

DB_PATH="/var/www/purple-port/server/prisma/dev.db"
BACKUP_PATH="/var/www/purple-port/server/prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)"
TEMP_PATH="/var/www/purple-port/server/prisma/dev.db.temp"

echo "=== Real Database Repair ==="
echo "Target: $DB_PATH"

echo "Stopping PM2 application..."
pm2 stop qix-api || true

echo "Creating backup..."
cp "$DB_PATH" "$BACKUP_PATH"
echo "Backup created at $BACKUP_PATH"

echo "Exporting data to SQL dump..."
sqlite3 "$DB_PATH" ".dump" > /tmp/real_database_dump.sql
echo "Data exported to /tmp/real_database_dump.sql"

echo "Recreating database from dump..."
rm -f "$TEMP_PATH"
sqlite3 "$TEMP_PATH" < /tmp/real_database_dump.sql
echo "New database created at $TEMP_PATH"

echo "Replacing old database with repaired version..."
mv "$DB_PATH" "$DB_PATH.corrupted"
mv "$TEMP_PATH" "$DB_PATH"

chmod 644 "$DB_PATH"

echo "Starting PM2 application..."
pm2 restart qix-api || pm2 start /var/www/purple-port/server/dist/server.js --name qix-api

echo "=== REPAIR COMPLETE ==="
