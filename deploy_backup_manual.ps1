# VPS Manual Deploy — Backup Feature
# Run this from a terminal. Enter VPS root password when prompted.

$ServerIP = "66.116.224.221"
$User = "root"
$LocalProjectDir = "f:\Antigravity"
$TempDir = "$LocalProjectDir\deploy_temp_backup_manual"
$ZipFile = "$LocalProjectDir\backup_feature_update.zip"

# SSH options that handle both old (ssh-rsa) and new key types
$SSHOpts = "-o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " MANUAL BACKUP FEATURE DEPLOY TO VPS   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Package
Write-Host "[1/3] Packaging..." -ForegroundColor Yellow
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
New-Item -ItemType Directory -Path "$TempDir" | Out-Null
Copy-Item "$LocalProjectDir\server\dist" "$TempDir\dist" -Recurse
Copy-Item "$LocalProjectDir\server\package.json" "$TempDir\package.json"
Copy-Item "$LocalProjectDir\server\package-lock.json" "$TempDir\package-lock.json"
Copy-Item "$LocalProjectDir\server\prisma" "$TempDir\prisma" -Recurse
if (Test-Path "$TempDir\prisma\dev.db") { Remove-Item "$TempDir\prisma\dev.db" }
if (Test-Path "$TempDir\prisma\prod.db") { Remove-Item "$TempDir\prisma\prod.db" }
New-Item -ItemType Directory -Path "$TempDir\public" | Out-Null
Copy-Item "$LocalProjectDir\client\dist\*" "$TempDir\public" -Recurse
if (Test-Path $ZipFile) { Remove-Item $ZipFile }
Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipFile
Write-Host "   Package ready: $ZipFile" -ForegroundColor Green

# Upload with password auth (prompts for password)
Write-Host "[2/3] Uploading to VPS — enter root password when prompted..." -ForegroundColor Yellow
Invoke-Expression "scp $SSHOpts `"$ZipFile`" `"${User}@${ServerIP}:/var/www/backup_feature_update.zip`""
if ($LASTEXITCODE -ne 0) { Write-Error "Upload failed"; exit 1 }
Write-Host "   Upload complete." -ForegroundColor Green

# Run remote commands (prompts for password again)
Write-Host "[3/3] Installing on VPS — enter root password when prompted..." -ForegroundColor Yellow
$remoteCmd = @'
bash -s << 'ENDBASH'
set -e
export PATH=$PATH:/usr/local/bin
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"

echo "-> Extracting to /var/www/antigravity..."
unzip -o -q /var/www/backup_feature_update.zip -d /var/www/antigravity

if [ -d /var/www/purple-port ]; then
  echo "-> Also extracting to /var/www/purple-port..."
  unzip -o -q /var/www/backup_feature_update.zip -d /var/www/purple-port
fi

echo "-> Installing npm deps..."
cd /var/www/antigravity
npm install --production --no-audit --silent

echo "-> Setting up backup directory..."
mkdir -p /var/backups/antigravity
chmod 755 /var/backups/antigravity

echo "-> Updating .env..."
for ENV_FILE in /var/www/antigravity/.env /var/www/purple-port/.env; do
  if [ -f "$ENV_FILE" ]; then
    grep -q "BACKUP_DIR" "$ENV_FILE" || echo "BACKUP_DIR=/var/backups/antigravity" >> "$ENV_FILE"
    grep -q "AUTO_BACKUP_ENABLED" "$ENV_FILE" || echo "AUTO_BACKUP_ENABLED=true" >> "$ENV_FILE"
    echo "   Updated $ENV_FILE"
  fi
done

echo "-> Restarting server..."
pm2 restart all

echo ""
echo "✅ BACKUP FEATURE DEPLOYED SUCCESSFULLY!"
echo "   Test: https://www.qixport.com/dashboard/settings -> Backup & Restore tab"
ENDBASH
'@
Invoke-Expression "ssh $SSHOpts ${User}@${ServerIP} `"$remoteCmd`""

Write-Host "========================================" -ForegroundColor Green
Write-Host " DONE! Backup feature is live on VPS    " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Cleanup
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
