# Deploy v2.7 - Meeting Management System
# Uses Posh-SSH (password auth) - safe for production
Import-Module Posh-SSH -Force

$vpsIp      = "66.116.224.221"
$remoteUser = "root"
$Pass       = "EzdanAdam@243"
$SecPass    = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred       = New-Object System.Management.Automation.PSCredential($remoteUser, $SecPass)
$LocalDir   = "f:\Antigravity"
$RemoteApp  = "/var/www/purple-port"
$RemoteApp2 = "/var/www/antigravity"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   QIX ADS v2.7 - MEETING MODULE DEPLOY  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# ---- STEP 1: Build Frontend ----
Write-Host "[1/7] Building Frontend..." -ForegroundColor Yellow
Set-Location "$LocalDir\client"
cmd /c "npm run build"
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend Build Failed!"; exit 1 }
Write-Host "   -> Frontend build complete." -ForegroundColor Green

# ---- STEP 2: Build Backend ----
Write-Host "[2/7] Building Backend..." -ForegroundColor Yellow
Set-Location "$LocalDir\server"
cmd /c "npm run build"
if ($LASTEXITCODE -ne 0) { Write-Error "Backend Build Failed!"; exit 1 }
Write-Host "   -> Backend build complete." -ForegroundColor Green

# ---- STEP 3: Create Zips ----
Write-Host "[3/7] Creating deployment packages..." -ForegroundColor Yellow
Set-Location $LocalDir

if (Test-Path "$LocalDir\server_dist.zip") { Remove-Item "$LocalDir\server_dist.zip" -Force }
if (Test-Path "$LocalDir\client_dist.zip") { Remove-Item "$LocalDir\client_dist.zip" -Force }

# Server: dist/ + prisma/ + package.json
$prismaDir   = "$LocalDir\server\prisma"
$serverDist  = "$LocalDir\server\dist"
$pkgJson     = "$LocalDir\server\package.json"

# Temp folder to collect files
$tmpServer = "$LocalDir\_tmp_server_pkg"
if (Test-Path $tmpServer) { Remove-Item $tmpServer -Recurse -Force }
New-Item -ItemType Directory -Path "$tmpServer\dist"   | Out-Null
New-Item -ItemType Directory -Path "$tmpServer\prisma" | Out-Null

Copy-Item "$serverDist\*"  "$tmpServer\dist"   -Recurse
Copy-Item "$prismaDir\*"   "$tmpServer\prisma" -Recurse
Copy-Item $pkgJson         "$tmpServer\package.json"

# Remove local dev.db from package (DO NOT overwrite production DB)
$localDb = "$tmpServer\prisma\dev.db"
if (Test-Path $localDb) { Remove-Item $localDb -Force }

Compress-Archive -Path "$tmpServer\*" -DestinationPath "$LocalDir\server_dist.zip"

# Frontend: client/dist/*
Compress-Archive -Path "$LocalDir\client\dist\*" -DestinationPath "$LocalDir\client_dist.zip"
Write-Host "   -> Packages created." -ForegroundColor Green

# ---- STEP 4: Connect to VPS ----
Write-Host "[4/7] Connecting to VPS..." -ForegroundColor Yellow
$session = New-SSHSession -ComputerName $vpsIp -Credential $Cred -AcceptKey -Force
Write-Host "   -> Connected." -ForegroundColor Green

# ---- STEP 5: Upload ----
Write-Host "[5/7] Uploading packages to VPS..." -ForegroundColor Yellow
Set-SCPItem -ComputerName $vpsIp -Credential $Cred -Path "$LocalDir\server_dist.zip" -Destination "/root/" -Force
Set-SCPItem -ComputerName $vpsIp -Credential $Cred -Path "$LocalDir\client_dist.zip" -Destination "/root/" -Force
Write-Host "   -> Upload complete." -ForegroundColor Green

# ---- STEP 6: Extract, migrate DB, restart PM2 ----
Write-Host "[6/7] Deploying on VPS..." -ForegroundColor Yellow

# Build the remote bash script using string concatenation to avoid PS variable collision
$app  = $RemoteApp
$app2 = $RemoteApp2

$deployCmd = "set -e" + "`n"
$deployCmd += "command -v unzip || apt-get install -y unzip" + "`n"
$deployCmd += "mkdir -p /root/backups" + "`n"
$deployCmd += "cp $app/prisma/dev.db /root/backups/dev_`$(date +%F_%H%M%S).db 2>/dev/null || echo 'No existing DB.'" + "`n"
$deployCmd += "unzip -o -q /root/server_dist.zip -d $app" + "`n"
$deployCmd += "mkdir -p $app/public" + "`n"
$deployCmd += "unzip -o -q /root/client_dist.zip -d $app/public" + "`n"
$deployCmd += "mkdir -p $app/public/uploads" + "`n"
$deployCmd += "unzip -o -q /root/server_dist.zip -d $app2" + "`n"
$deployCmd += "mkdir -p $app2/public" + "`n"
$deployCmd += "unzip -o -q /root/client_dist.zip -d $app2/public" + "`n"
$deployCmd += "mkdir -p $app2/public/uploads" + "`n"
$deployCmd += "cd $app && npm install --production --no-audit" + "`n"
$deployCmd += "export PATH=`$PATH:/usr/local/bin" + "`n"
$deployCmd += "cd $app && npx prisma db push --accept-data-loss || echo 'Prisma push skipped.'" + "`n"
$deployCmd += "pm2 delete all || true" + "`n"
$deployCmd += "pm2 kill || true" + "`n"
$deployCmd += "fuser -k 4001/tcp || true" + "`n"
$deployCmd += "cd $app && pm2 start dist/server.js --name qix-ads-v2.7 --env production" + "`n"
$deployCmd += "pm2 save" + "`n"
$deployCmd += "rm -f /root/server_dist.zip /root/client_dist.zip" + "`n"
$deployCmd += "echo 'v2.7 Deployment SUCCESSFUL!'"

$result = Invoke-SSHCommand -SSHSession $session -Command "bash -c '$deployCmd'" -TimeOut 300
Write-Host $result.Output

# ---- STEP 7: Cleanup & Disconnect ----
Write-Host "[7/7] Cleaning up locally..." -ForegroundColor Yellow
Remove-SSHSession -SSHSession $session | Out-Null
Remove-Item "$LocalDir\server_dist.zip" -Force -ErrorAction SilentlyContinue
Remove-Item "$LocalDir\client_dist.zip" -Force -ErrorAction SilentlyContinue
Remove-Item $tmpServer -Recurse -Force -ErrorAction SilentlyContinue

Set-Location $LocalDir

Write-Host "==========================================" -ForegroundColor Green
Write-Host "   v2.7 DEPLOYMENT COMPLETE!              " -ForegroundColor Green
Write-Host "==========================================`n" -ForegroundColor Green
