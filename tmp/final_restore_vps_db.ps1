$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    
    $BACKUP_PATH = "/var/backups/antigravity/backup-offline-2026-03-30T04-48-37-177Z.zip"
    $TARGET_DB = "/var/www/purple-port/server/prisma/dev.db"
    
    Write-Host "Stopping service..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 stop qix-ads-v2.7"
    
    Write-Host "Pulling the latest github change (the git rm dev.db fix)..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port && git fetch origin && git reset --hard origin/main"
    
    Write-Host "Extracting and restoring from the safe 54MB backup..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "rm -rf /tmp/restore_db && mkdir -p /tmp/restore_db && unzip -o $BACKUP_PATH -d /tmp/restore_db"
    Invoke-SSHCommand -SessionId $s.SessionId -Command "cp /tmp/restore_db/database.sqlite $TARGET_DB"
    
    Write-Host "Cleaning up journal files to prevent SQLite malformed disk image errors..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "rm -f ${TARGET_DB}-wal ${TARGET_DB}-shm ${TARGET_DB}-journal"
    
    Write-Host "Synchronizing the restored database schema with Prisma (Safe push)..."
    $r1 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && npx prisma db push --accept-data-loss=false"
    Write-Host $r1.Output
    
    Write-Host "Restarting service..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 start qix-ads-v2.7"
    
    Write-Host "Restoration complete! Checking DB size:"
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "ls -lh $TARGET_DB"
    Write-Host $($r2.Output)
    
} catch {
    $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
