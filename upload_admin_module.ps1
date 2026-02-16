# Upload Admin Module to VPS
# This script uploads the new admin module files to the VPS

$VPS_IP = "66.116.224.221"
$VPS_USER = "root"
$VPS_PATH = "/var/www/purple-port"

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Uploading Admin Module to VPS" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Create admin directory on VPS
Write-Host "Creating admin directory on VPS..." -ForegroundColor Yellow
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $VPS_USER@$VPS_IP "mkdir -p $VPS_PATH/src/modules/admin"

# Upload admin module files
Write-Host "Uploading database.controller.ts..." -ForegroundColor Yellow
scp -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa "f:\Antigravity\server\src\modules\admin\database.controller.ts" "${VPS_USER}@${VPS_IP}:${VPS_PATH}/src/modules/admin/"

Write-Host "Uploading routes.ts..." -ForegroundColor Yellow
scp -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa "f:\Antigravity\server\src\modules\admin\routes.ts" "${VPS_USER}@${VPS_IP}:${VPS_PATH}/src/modules/admin/"

# Upload updated app.ts
Write-Host "Uploading updated app.ts..." -ForegroundColor Yellow
scp -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa "f:\Antigravity\server\src\app.ts" "${VPS_USER}@${VPS_IP}:${VPS_PATH}/src/"

# Rebuild on VPS
Write-Host ""
Write-Host "Rebuilding application on VPS..." -ForegroundColor Yellow
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa $VPS_USER@$VPS_IP "cd $VPS_PATH && npm run build && pm2 restart all"

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "Upload Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit"
