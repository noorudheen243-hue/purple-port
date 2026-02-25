# Deploy Backup Feature to VPS
# Packages changed server + client builds and uploads to 66.116.224.221

$ServerIP = "66.116.224.221"
$User = "root"
$LocalProjectDir = "f:\Antigravity"
$TempDir = "$LocalProjectDir\deploy_temp_backup"
$ZipFile = "$LocalProjectDir\backup_feature_update.zip"
$KeyPath = "$LocalProjectDir\deploy_key"

$SSHOptions = "-i `"$KeyPath`" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   DEPLOYING BACKUP FEATURE TO VPS        " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# ---- Package Phase ----
Write-Host "[1/4] Packaging artifacts..." -ForegroundColor Yellow
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
New-Item -ItemType Directory -Path "$TempDir" | Out-Null

# Server compiled dist
Copy-Item "$LocalProjectDir\server\dist" "$TempDir\dist" -Recurse
Copy-Item "$LocalProjectDir\server\package.json" "$TempDir\package.json"
Copy-Item "$LocalProjectDir\server\package-lock.json" "$TempDir\package-lock.json"
Copy-Item "$LocalProjectDir\server\prisma" "$TempDir\prisma" -Recurse
# Remove local DB files
if (Test-Path "$TempDir\prisma\dev.db") { Remove-Item "$TempDir\prisma\dev.db" }
if (Test-Path "$TempDir\prisma\prod.db") { Remove-Item "$TempDir\prisma\prod.db" }

# Frontend build -> public folder (served by express)
New-Item -ItemType Directory -Path "$TempDir\public" | Out-Null
Copy-Item "$LocalProjectDir\client\dist\*" "$TempDir\public" -Recurse

# Zip
if (Test-Path $ZipFile) { Remove-Item $ZipFile }
Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipFile
Write-Host "   Package: $ZipFile" -ForegroundColor Green

# ---- Upload Phase ----
Write-Host "[2/4] Uploading to VPS ($ServerIP)..." -ForegroundColor Yellow
scp -i "$KeyPath" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no "$ZipFile" "${User}@${ServerIP}:/var/www/backup_feature_update.zip"
if ($LASTEXITCODE -ne 0) { Write-Error "Upload Failed"; exit 1 }
Write-Host "   Upload complete." -ForegroundColor Green

# ---- Remote Execution ----
Write-Host "[3/4] Running remote update on VPS..." -ForegroundColor Yellow

$RemoteScript = @"
#!/bin/bash
export PATH=`$PATH:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/bin:/sbin
[ -s "`$HOME/.nvm/nvm.sh" ] && \. "`$HOME/.nvm/nvm.sh"
set -e

APP_DIR="/var/www/antigravity"
ZIP="/var/www/backup_feature_update.zip"

echo "-> Ensuring unzip is available..."
command -v unzip || apt-get install -y unzip

echo "-> Deploying to: `$APP_DIR"
mkdir -p `$APP_DIR
unzip -o -q `$ZIP -d `$APP_DIR
echo "   Extracted."

echo "-> Installing production dependencies..."
cd `$APP_DIR
npm install --production --no-audit --silent

echo "-> Creating backup storage directory..."
mkdir -p /var/backups/antigravity
chmod 755 /var/backups/antigravity

echo "-> Adding env vars if needed..."
ENV_FILE="`$APP_DIR/.env"
if [ -f "`$ENV_FILE" ]; then
    grep -q "BACKUP_DIR" "`$ENV_FILE" || echo "BACKUP_DIR=/var/backups/antigravity" >> "`$ENV_FILE"
    grep -q "AUTO_BACKUP_ENABLED" "`$ENV_FILE" || echo "AUTO_BACKUP_ENABLED=true" >> "`$ENV_FILE"
    echo "   .env updated."
else
    echo "   WARNING: .env not found at `$ENV_FILE"
fi

# Also update purple-port if it exists
if [ -d "/var/www/purple-port" ]; then
    echo "-> Also deploying to /var/www/purple-port..."
    unzip -o -q `$ZIP -d /var/www/purple-port
    cd /var/www/purple-port
    npm install --production --no-audit --silent
    mkdir -p /var/backups/antigravity
    ENV_FILE2="/var/www/purple-port/.env"
    if [ -f "`$ENV_FILE2" ]; then
        grep -q "BACKUP_DIR" "`$ENV_FILE2" || echo "BACKUP_DIR=/var/backups/antigravity" >> "`$ENV_FILE2"
        grep -q "AUTO_BACKUP_ENABLED" "`$ENV_FILE2" || echo "AUTO_BACKUP_ENABLED=true" >> "`$ENV_FILE2"
    fi
fi

echo "-> Restarting server via PM2..."
pm2 restart all || pm2 start `$APP_DIR/dist/server.js --name antigravity-app --env production
pm2 save

echo ""
echo "✅ BACKUP FEATURE DEPLOYED SUCCESSFULLY!"
echo "   Backup dir: /var/backups/antigravity"
"@

$RemoteScript = $RemoteScript -replace "`r", ""
ssh -i "$KeyPath" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no -t "${User}@${ServerIP}" "bash -c '$RemoteScript'"

if ($LASTEXITCODE -ne 0) { Write-Error "Remote execution failed"; exit 1 }

# Cleanup
Write-Host "[4/4] Cleaning up..." -ForegroundColor Yellow
Set-Location $LocalProjectDir
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }

Write-Host "==========================================" -ForegroundColor Green
Write-Host "   BACKUP FEATURE LIVE ON qixport.com!    " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
