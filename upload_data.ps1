<#
.SYNOPSIS
    Uploads the local SQLite database to the VPS, overwriting the remote data.
.DESCRIPTION
    1. Stops the remote application to release the DB lock.
    2. Uploads local 'dev.db' to the VPS using SCP.
    3. Restarts the remote application.
#>

$VPS_IP = "66.116.224.221"
$VPS_USER = "root"
$LocalDB = "f:\Antigravity\server\prisma\dev.db"
$RemoteDB = "/var/www/purple-port/server/prisma/dev.db"

Write-Host "--- WARNING: This will OVERWRITE the database on $VPS_IP ---" -ForegroundColor Red
Write-Host "--- All data currently on the VPS will be replaced with your local data ---" -ForegroundColor Yellow
$confirmation = Read-Host "Are you sure you want to proceed? (Type 'yes')"

if ($confirmation -ne 'yes') {
    Write-Host "Upload cancelled."
    exit
}

# 1. Stop Remote App
Write-Host "`n[1/3] Stopping remote application..." -ForegroundColor Cyan
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $VPS_USER@$VPS_IP "pm2 stop purple-port-server"

# 2. Upload DB
Write-Host "`n[2/3] Uploading local database..." -ForegroundColor Cyan
scp -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $LocalDB "${VPS_USER}@${VPS_IP}:${RemoteDB}"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed!" -ForegroundColor Red
    exit
}

# 3. Restart Remote App
Write-Host "`n[3/3] Restarting remote application..." -ForegroundColor Cyan
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $VPS_USER@$VPS_IP "pm2 restart purple-port-server"

Write-Host "`nData migration complete!" -ForegroundColor Green
