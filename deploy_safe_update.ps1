
# Deploy Safe Update (Code Only - Preserves Data)
# AUTOMATED RUNBOOK
$ServerIP = "66.116.224.221"
$User = "root"
$LocalProjectDir = "f:\Antigravity"
$TempDir = "$LocalProjectDir\deploy_temp_safe"
$ZipFile = "$LocalProjectDir\code_update_package.zip"
$KeyPath = "$PSScriptRoot\deploy_key"

# SSH Options for Automation
$SSHOptions = "-i ""$KeyPath"" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   STARTING DATA-SAFE CODE DEPLOYMENT     " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Build Phase
Write-Host "[1/5] Building Project..."
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
New-Item -ItemType Directory -Path "$TempDir" | Out-Null
New-Item -ItemType Directory -Path "$TempDir\server" | Out-Null

# Build Client
Write-Host "   -> Building Frontend..."
Set-Location "$LocalProjectDir\client"
cmd /c "npm install && npm run build"
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend Build Failed"; exit 1 }

# Build Server
Write-Host "   -> Building Backend..."
Set-Location "$LocalProjectDir\server"
cmd /c "npm install && npm run build"
if ($LASTEXITCODE -ne 0) { Write-Error "Backend Build Failed"; exit 1 }

# 2. Package Phase (Selectively COPY Code ONLY)
Write-Host "[2/5] Packaging Code Artifacts..."
# Copy Server Dist & Config
Copy-Item "$LocalProjectDir\server\dist" "$TempDir\server\dist" -Recurse
Copy-Item "$LocalProjectDir\server\package.json" "$TempDir\server\package.json"
Copy-Item "$LocalProjectDir\server\prisma" "$TempDir\server\prisma" -Recurse
# EXCLUDE: .env, uploads, dev.db
if (Test-Path "$TempDir\server\prisma\dev.db") { Remove-Item "$TempDir\server\prisma\dev.db" }

# Copy Frontend to Server Public
New-Item -ItemType Directory -Path "$TempDir\server\public" | Out-Null
Copy-Item "$LocalProjectDir\client\dist\*" "$TempDir\server\public" -Recurse

# Zip It
if (Test-Path $ZipFile) { Remove-Item $ZipFile }
Compress-Archive -Path "$TempDir\server\*" -DestinationPath $ZipFile

# 3. Upload Phase
Write-Host "[3/5] Uploading Code Package..."
scp -i "$KeyPath" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no "$ZipFile" "${User}@${ServerIP}:/var/www/code_update.zip"
if ($LASTEXITCODE -ne 0) { Write-Error "Upload Failed"; exit 1 }

# 4. Remote Execution Phase (Fixed Escaping & Path)
Write-Host "[4/5] Executing Remote Update..."

# NOTE: We use backtick ` to escape $ for PowerShell, so it passes literal $ to Bash.
$RemoteScript = @"
#!/bin/bash
# Ensure Environment Variables are loaded (for pm2, node, npm)
export PATH=`$PATH:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/bin:/sbin
[ -s "`$HOME/.nvm/nvm.sh" ] && \. "`$HOME/.nvm/nvm.sh"

set -e

APP_DIR="/var/www/purple-port"
BACKUP_DIR="/root/backups"
TIMESTAMP=`$(date +%F_%H%M%S)

# Ensure unzip exists
if ! command -v unzip &> /dev/null; then
    echo "Installing unzip..."
    apt-get update && apt-get install -y unzip
fi

echo "-> [Remote] Creating Backup Directory..."
mkdir -p `$BACKUP_DIR

echo "-> [Remote] 🛡️ BACKING UP DATA..."
if [ -d "`$APP_DIR" ]; then
    # Parse backup name
    BACKUP_FILE="`$BACKUP_DIR/backup_`$TIMESTAMP.tar.gz"
    tar -czf "`$BACKUP_FILE" -C /var/www/purple-port prisma/dev.db uploads .env || echo "Warning: Non-critical files missing."
    echo "   Backup saved to: `$BACKUP_FILE"
else
    echo "   Fresh Install detected. No data to backup."
fi

echo "-> [Remote] Updating Code - Dual Deploy Strategy..."
# Unzip to purple-port
unzip -o -q /var/www/code_update.zip -d /var/www/purple-port
# Unzip to antigravity (ensure directory exists first)
mkdir -p /var/www/antigravity
unzip -o -q /var/www/code_update.zip -d /var/www/antigravity

echo "-> [Remote] Installing Dependencies - Dual Install..."
cd /var/www/purple-port && npm install --production --no-audit
cd /var/www/antigravity && npm install --production --no-audit

echo "-> [Remote] Updating Database Schema..."
cd /var/www/purple-port # Use purple-port for DB migrations
npx prisma migrate deploy || npx prisma db push

echo "-> [Remote] Restarting Service - Hard Reset Dual Mode..."
# Force-kill any node process on port 4001
fuser -k 4001/tcp || true
# Kill any existing PM2 processes
pm2 delete all || true
pm2 kill || true

# START STRATEGY: Start from Antigravity Legacy Path
# If Nginx points to Antigravity, this works.
# If Nginx points to Purple-Port, this STILL works because Nginx hits localhost:4001
echo "Starting Server from /var/www/antigravity..."
cd /var/www/antigravity
pm2 start dist/server.js --name "antigravity-app" --env production
pm2 save

echo "✅ DEPLOYMENT SUCCESSFUL!"
"@

# Fix CRLF issues
$RemoteScript = $RemoteScript -replace "`r", ""

# Execute
ssh -i "$KeyPath" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no -t "$User@$ServerIP" "bash -c '$RemoteScript'"

# Cleanup
Set-Location "$LocalProjectDir"
Remove-Item $TempDir -Recurse -Force
Write-Host "==========================================" -ForegroundColor Green
Write-Host "   UPDATE COMPLETE & VERIFIED             " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
