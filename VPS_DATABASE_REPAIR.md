# VPS Database Repair Instructions

## Prerequisites
- SSH access to VPS (66.116.224.221)
- Root or sudo privileges

## Steps to Repair

### 1. Upload Repair Script
```bash
# From your local machine
scp f:\Antigravity\server\scripts\repair_vps_database.sh root@66.116.224.221:/tmp/
```

### 2. SSH into VPS
```bash
ssh root@66.116.224.221
```

### 3. Run Repair Script
```bash
cd /tmp
chmod +x repair_vps_database.sh
./repair_vps_database.sh
```

### 4. Restart Application
```bash
cd /var/www/purple-port
pm2 restart all
```

### 5. Verify
Check if the bridge now uploads successfully.

## What the Script Does
1. **Backup**: Creates timestamped backup of corrupted database
2. **Check**: Runs SQLite integrity check
3. **Export**: Dumps all data to SQL file
4. **Rebuild**: Creates new database from dump
5. **Replace**: Swaps corrupted DB with repaired version

## Rollback (if needed)
```bash
cd /var/www/purple-port/prisma
mv dev.db dev.db.failed_repair
mv dev.db.backup.YYYYMMDD_HHMMSS dev.db
pm2 restart all
```
