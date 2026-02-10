$ErrorActionPreference = "Stop"

# Configuration
$VPS_IP = "66.116.224.221"
$VPS_USER = "root"
$LOCAL_DB_PATH = "server/prisma/dev.db"
$LOCAL_UPLOADS_PATH = "server/uploads"

$PATHS = @("/var/www/purple-port", "/var/www/antigravity")

Write-Host "--- A N T I G R A V I T Y   D A T A   P U S H   (D U A L   T A R G E T) ---" -ForegroundColor Cyan
Write-Host "Target: $VPS_IP" -ForegroundColor Yellow
Write-Host "This will OVERWRITE the online database in BOTH potential locations." -ForegroundColor Red

# 1. Stop Remote Server
Write-Host "`n[1/4] Stopping Remote Server..." -ForegroundColor Green
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $VPS_USER@$VPS_IP "pm2 stop all"

foreach ($BASE_PATH in $PATHS) {
    $REMOTE_SERVER = "$BASE_PATH/server"
    Write-Host "`n>>> Processing: $BASE_PATH" -ForegroundColor Cyan
    
    # Check if folder exists (simple check via ls)
    # We proceed anyway, mkdir -p handles creation
    
    # 2. Backup & Prepare
    $CMD_PREP = "mkdir -p $REMOTE_SERVER/prisma && mkdir -p $REMOTE_SERVER/uploads"
    # Backup if db exists
    $CMD_PREP += " && if [ -f $REMOTE_SERVER/prisma/dev.db ]; then cp $REMOTE_SERVER/prisma/dev.db $REMOTE_SERVER/prisma/backup-auto.db; fi"
    
    ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $VPS_USER@$VPS_IP "$CMD_PREP"

    # 3. Upload Database (To Both Locations in Target)
    Write-Host "    Uploading Database..." -ForegroundColor Green
    scp -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $LOCAL_DB_PATH "${VPS_USER}@${VPS_IP}:${REMOTE_SERVER}/prisma/dev.db"
    scp -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $LOCAL_DB_PATH "${VPS_USER}@${VPS_IP}:${REMOTE_SERVER}/dev.db"

    # 4. Upload Files
    Write-Host "    Syncing Uploads..." -ForegroundColor Green
    if (Test-Path $LOCAL_UPLOADS_PATH) {
        scp -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -r $LOCAL_UPLOADS_PATH "${VPS_USER}@${VPS_IP}:${REMOTE_SERVER}/"
    }

    # 5. Config .env
    Write-Host "    Updating .env..." -ForegroundColor Green
    $ENV_CMD = "echo 'PORT=4001' > $REMOTE_SERVER/.env"
    $ENV_CMD += " && echo 'DATABASE_URL=""file:./dev.db""' >> $REMOTE_SERVER/.env"
    $ENV_CMD += " && echo 'JWT_SECRET=""super-secret-key-change-this""' >> $REMOTE_SERVER/.env"
    $ENV_CMD += " && echo 'CLIENT_URL=""http://$VPS_IP""' >> $REMOTE_SERVER/.env"
    $ENV_CMD += " && echo 'BIOMETRIC_API_KEY=""ag_bio_sync_v1_secret_key""' >> $REMOTE_SERVER/.env"
    $ENV_CMD += " && echo 'NODE_ENV=production' >> $REMOTE_SERVER/.env"
    
    ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $VPS_USER@$VPS_IP "$ENV_CMD"

    # 6. Fix Dependencies & Rebuild (CRITICAL Fix for "Module Not Found")
    Write-Host "    Installing Dependencies (This may take a minute)..." -ForegroundColor Yellow
    ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $VPS_USER@$VPS_IP "cd $REMOTE_SERVER && npm install --omit=dev && npm rebuild && npx prisma generate"

    # 7. Restart Server Process (Locally first to check)
    # We will do a global restart at the end, but let's try starting this specific one if needed.
}

# 8. Global Restart
Write-Host "`n[4/4] Restarting Remote Server..." -ForegroundColor Green
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $VPS_USER@$VPS_IP "pm2 restart all"

Write-Host "`n✅ SUCCESS! Data Push Complete." -ForegroundColor Cyan
Write-Host "Please refresh your website." -ForegroundColor Gray
