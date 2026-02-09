$ErrorActionPreference = "Stop"

# Configuration
$VPS_IP = "66.116.224.221"
$VPS_USER = "root"
$LOCAL_DB = "f:\Antigravity\server\prisma\dev.db"
$REMOTE_PATH = "/var/www/purple-port/server/prisma/dev.db"

# SSH Options for Legacy Keys
$SSH_OPTS = "-o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa"

Write-Host ">>> Starting Deployment to $VPS_IP..." -ForegroundColor Cyan

# 1. Check if DB exists
if (!(Test-Path $LOCAL_DB)) {
    Write-Error "Local Database file not found: $LOCAL_DB"
}

# 2. Upload Database
Write-Host ">>> Uploading Database (Enter Password when asked)..." -ForegroundColor Yellow
scp $SSH_OPTS $LOCAL_DB "${VPS_USER}@${VPS_IP}:${REMOTE_PATH}"

# 3. Restart Server
Write-Host ">>> Restarting Server..." -ForegroundColor Yellow
ssh $SSH_OPTS "${VPS_USER}@${VPS_IP}" "cd /var/www/purple-port/server && npx prisma db push && pm2 restart all"

Write-Host ">>> Deployment Complete!" -ForegroundColor Green
Write-Host ">>> You can now visit http://$VPS_IP" -ForegroundColor Cyan
