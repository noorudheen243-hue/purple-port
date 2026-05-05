
# Targeted Ledger Fix Deploy - Only patches the changed server file
$ServerIP = "66.116.224.221"
$User = "root"
$KeyPath = "$PSScriptRoot\deploy_key"
$SSHOpts = "-i `"$KeyPath`" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TARGETED LEDGER FIX DEPLOY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Build only the server
Write-Host "[1/3] Building Server..." -ForegroundColor Yellow
Set-Location "f:\Antigravity\server"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Server build failed"; exit 1 }
Write-Host "    Server built OK" -ForegroundColor Green

# Step 2: Upload ONLY the accounting service compiled file
Write-Host "[2/3] Uploading changed file to VPS..." -ForegroundColor Yellow

$LocalFile = "f:\Antigravity\server\dist\modules\accounting\service.js"

# Upload to both app dirs
& scp -i "$KeyPath" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no `
    "$LocalFile" `
    "${User}@${ServerIP}:/var/www/purple-port/dist/modules/accounting/service.js"

if ($LASTEXITCODE -ne 0) { Write-Error "SCP to purple-port failed"; exit 1 }
Write-Host "    Uploaded to purple-port" -ForegroundColor Green

& scp -i "$KeyPath" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no `
    "$LocalFile" `
    "${User}@${ServerIP}:/var/www/antigravity/dist/modules/accounting/service.js"

Write-Host "    Uploaded to antigravity" -ForegroundColor Green

# Step 3: Restart PM2
Write-Host "[3/3] Restarting PM2 on VPS..." -ForegroundColor Yellow
& ssh -i "$KeyPath" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no `
    "${User}@${ServerIP}" `
    "pm2 restart all && pm2 save"

if ($LASTEXITCODE -ne 0) { Write-Error "PM2 restart failed"; exit 1 }

Write-Host "========================================" -ForegroundColor Green
Write-Host "  LEDGER FIX DEPLOYED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
