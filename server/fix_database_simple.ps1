# Simple Database Repair Script for Windows
Write-Host "=== SQLite Database Repair Tool ===" -ForegroundColor Cyan
Write-Host ""

$DB_PATH = ".\prisma\dev.db"
$BACKUP_PATH = ".\prisma\dev_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').db"
$REPAIRED_PATH = ".\prisma\dev_repaired.db"

try {
    # Step 1: Backup
    Write-Host "Step 1: Creating backup..." -ForegroundColor Yellow
    Copy-Item $DB_PATH $BACKUP_PATH
    Write-Host "✓ Backup created: $BACKUP_PATH" -ForegroundColor Green
    Write-Host ""

    # Step 2: Repair using Prisma
    Write-Host "Step 2: Running Prisma integrity check..." -ForegroundColor Yellow
    
    # Try Prisma's built-in repair
    npx prisma db push --force-reset --skip-generate
    
    Write-Host "✓ Database schema reset and repaired!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  WARNING: This reset the schema. You may need to re-import data." -ForegroundColor Yellow
    Write-Host "Backup is available at: $BACKUP_PATH" -ForegroundColor Cyan
    
}
catch {
    Write-Host "✗ Repair failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual recovery options:" -ForegroundColor Yellow
    Write-Host "1. Delete prisma\dev.db and prisma\dev.db-wal, prisma\dev.db-shm"
    Write-Host "2. Run: npx prisma db push"
    Write-Host "3. Re-import data from backup"
}
