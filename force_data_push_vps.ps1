$ErrorActionPreference = "Stop"

# Configuration
$VPS_IP = "66.116.224.221"
$VPS_USER = "root"
$REMOTE_PATH = "/var/www/purple-port"
$LOCAL_DB_PATH = "server/prisma/dev.db"
$LOCAL_UPLOADS_PATH = "server/uploads"

Write-Host "--- A N T I G R A V I T Y   D A T A   P U S H ---" -ForegroundColor Cyan
Write-Host "Target: $VPS_IP" -ForegroundColor Yellow
Write-Host "This will OVERWRITE the online database. Press ENTER to continue or CTRL+C to cancel." -ForegroundColor Red
Read-Host

# 1. Stop Remote Server (Prevent DB Corruption)
Write-Host "`n[1/5] Stopping Remote Server..." -ForegroundColor Green
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $VPS_USER@$VPS_IP "pm2 stop all"

# 2. Backup Remote DB (Safety First)
Write-Host "`n[2/5] Creating Safety Backup on VPS..." -ForegroundColor Green
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $VPS_USER@$VPS_IP "cp $REMOTE_PATH/server/prisma/dev.db $REMOTE_PATH/server/prisma/backup-auto.db"

# 3. Upload Database (To Both Possible Locations)
Write-Host "`n[3/5] Uploading Database (dev.db)..." -ForegroundColor Green
# Location 1: inside prisma folder (standard dev)
scp -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $LOCAL_DB_PATH "${VPS_USER}@${VPS_IP}:${REMOTE_PATH}/server/prisma/dev.db"
# Location 2: inside server root (standard prod/docker sometimes)
scp -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $LOCAL_DB_PATH "${VPS_USER}@${VPS_IP}:${REMOTE_PATH}/server/dev.db"

# 4. Upload Files (Uploads Folder)
Write-Host "`n[4/5] Syncing Uploads Folder..." -ForegroundColor Green
if (Test-Path $LOCAL_UPLOADS_PATH) {
    scp -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -r $LOCAL_UPLOADS_PATH "${VPS_USER}@${VPS_IP}:${REMOTE_PATH}/server/"
}
else {
    Write-Host "No uploads folder found locally, skipping." -ForegroundColor Yellow
}

# 5. Restart Remote Server
Write-Host "`n[5/5] Restarting Remote Server..." -ForegroundColor Green
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $VPS_USER@$VPS_IP "cd $REMOTE_PATH/server && npx prisma generate && pm2 restart all"

Write-Host "`n✅ SUCCESS! Data Push Complete." -ForegroundColor Cyan
Write-Host "Please refresh your website to see the changes." -ForegroundColor Gray
