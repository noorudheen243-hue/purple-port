# Pull from Cloud Script (Sync to Local)
# Purpose: Downloads Code, Database, and ALL Uploads from VPS to Localhost

$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$REMOTE_PATH = "/var/www/purple-port"
$KEY_PATH = "f:\Antigravity\deploy_key"

Clear-Host
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   STARTING CLOUD TO LOCAL PULL (SYNC)    " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Step 1: Archive Remote Data
Write-Host "[1/4] Archiving Remote Data on VPS (Code + DB + Uploads)..." -ForegroundColor Cyan
$TEMP_ZIP = "pull_package_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip"
# Including server/prisma/dev.db, server/src, client/src, and BOTH uploads folders
$SSH_CMD = "cd $REMOTE_PATH && zip -r /root/$TEMP_ZIP server/prisma/dev.db server/src client/src server/uploads uploads"
ssh -i $KEY_PATH -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP $SSH_CMD

# Step 2: Download Archive
Write-Host "[2/4] Downloading Archive from VPS..." -ForegroundColor Cyan
scp -i $KEY_PATH -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP`:/root/$TEMP_ZIP" ./$TEMP_ZIP

# Step 3: Extract Locally
Write-Host "[3/4] Extracting Files Locally..." -ForegroundColor Cyan
if (Test-Path $TEMP_ZIP) {
    Expand-Archive -Path ./$TEMP_ZIP -DestinationPath ./ -Force
    Remove-Item ./$TEMP_ZIP -Force
}
else {
    Write-Host "ERROR: Download failed. Archive not found." -ForegroundColor Red
    exit 1
}

# Step 4: Cleanup VPS
Write-Host "[4/4] Cleaning Up Temporary Files..." -ForegroundColor Cyan
ssh -i $KEY_PATH -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP "rm /root/$TEMP_ZIP"

Write-Host "==========================================" -ForegroundColor Green
Write-Host "   PULL COMPLETE! LOCALHOST IS IN SYNC    " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
