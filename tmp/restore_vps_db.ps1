$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    
    $BACKUP_PATH = "/var/backups/antigravity/backup-offline-2026-03-30T04-48-37-177Z.zip"
    $TARGET_DB = "/var/www/purple-port/server/prisma/dev.db"
    
    Write-Host "Stopping service..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 stop qix-ads-v2.7"
    
    Write-Host "Renaming current corrupted DB..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "mv $TARGET_DB ${TARGET_DB}.corrupted_by_deploy_0923"
    
    Write-Host "Extracting and restoring from 54MB backup..."
    # Inside the zip, the file is database.sqlite
    Invoke-SSHCommand -SessionId $s.SessionId -Command "rm -rf /tmp/restore_db && mkdir -p /tmp/restore_db && unzip -o $BACKUP_PATH -d /tmp/restore_db"
    Invoke-SSHCommand -SessionId $s.SessionId -Command "cp /tmp/restore_db/database.sqlite $TARGET_DB"
    
    Write-Host "Cleaning up journal files..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "rm -f ${TARGET_DB}-wal ${TARGET_DB}-shm ${TARGET_DB}-journal"
    
    Write-Host "Restarting service..."
    Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 start qix-ads-v2.7"
    
    Write-Host "Restoration complete!"
    
    # Final check: is dev.db size now around 54MB?
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command "ls -lh $TARGET_DB"
    Write-Host "Current DB size: $($r.Output)"
    
} catch {
    $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
