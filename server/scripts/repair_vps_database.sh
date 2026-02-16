#!/bin/bash

# SQLite Database Repair Script for VPS
# This script safely repairs a corrupted SQLite database

set -e  # Exit on error

echo "=== SQLite Database Repair Script ==="
echo "Target: /var/www/purple-port/prisma/dev.db"
echo ""

DB_PATH="/var/www/purple-port/prisma/dev.db"
BACKUP_PATH="/var/www/purple-port/prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)"
TEMP_PATH="/var/www/purple-port/prisma/dev.db.temp"

# Step 1: Backup
echo "[1/5] Creating backup..."
if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "$BACKUP_PATH"
    echo "✓ Backup created: $BACKUP_PATH"
else
    echo "✗ Database file not found!"
    exit 1
fi

# Step 2: Integrity Check
echo ""
echo "[2/5] Running integrity check..."
sqlite3 "$DB_PATH" "PRAGMA integrity_check;" > /tmp/integrity_check.txt
cat /tmp/integrity_check.txt

if grep -q "ok" /tmp/integrity_check.txt; then
    echo "✓ Database is OK (no repair needed)"
    exit 0
fi

# Step 3: Export Data
echo ""
echo "[3/5] Exporting data from corrupted database..."
sqlite3 "$DB_PATH" ".dump" > /tmp/database_dump.sql
echo "✓ Data exported to /tmp/database_dump.sql"

# Step 4: Create New Database
echo ""
echo "[4/5] Creating new database from export..."
rm -f "$TEMP_PATH"
sqlite3 "$TEMP_PATH" < /tmp/database_dump.sql
echo "✓ New database created"

# Step 5: Replace Old Database
echo ""
echo "[5/5] Replacing corrupted database..."
mv "$DB_PATH" "$DB_PATH.corrupted"
mv "$TEMP_PATH" "$DB_PATH"
echo "✓ Database replaced"

# Final Integrity Check
echo ""
echo "Running final integrity check..."
sqlite3 "$DB_PATH" "PRAGMA integrity_check;"

echo ""
echo "=== REPAIR COMPLETE ==="
echo "Original (corrupted): $DB_PATH.corrupted"
echo "Backup: $BACKUP_PATH"
echo "New (repaired): $DB_PATH"
echo ""
echo "Please restart your application server (pm2 restart all)"
