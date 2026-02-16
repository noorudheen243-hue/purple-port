#!/bin/bash
# Quick Database Repair Script for VPS
# Run this on the VPS to repair the corrupted database

cd /var/www/purple-port

echo "=== Database Repair ==="
echo ""

DB_PATH="prisma/dev.db"
BACKUP_PATH="prisma/dev.db.backup.$(date +%s)"
DUMP_PATH="/tmp/db_dump.sql"

# Backup
echo "[1/4] Creating backup..."
cp "$DB_PATH" "$BACKUP_PATH"
echo "✓ Backup: $BACKUP_PATH"

# Check integrity
echo ""
echo "[2/4] Checking integrity..."
sqlite3 "$DB_PATH" "PRAGMA integrity_check;" || echo "Database is corrupted"

# Export and recreate
echo ""
echo "[3/4] Exporting data..."
sqlite3 "$DB_PATH" ".dump" > "$DUMP_PATH"

echo ""
echo "[4/4] Creating new database..."
mv "$DB_PATH" "prisma/dev.db.corrupted"
sqlite3 "$DB_PATH" < "$DUMP_PATH"

echo ""
echo "=== REPAIR COMPLETE ==="
echo "Now run: pm2 restart all"
