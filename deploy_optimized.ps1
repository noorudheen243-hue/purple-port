# Unified Performance Optimizer & Deployer
$ServerIP = "66.116.224.221"
$User = "root"
$LocalProjectDir = "f:\Antigravity"
$TempDir = "$LocalProjectDir\deploy_temp_optimized"
$ZipFile = "$LocalProjectDir\performance_update.zip"
$KeyPath = "$LocalProjectDir\deploy_key"
$NginxLocalConfig = "$LocalProjectDir\nginx_optimized.conf"

$SSHOptions = "-i ""$KeyPath"" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   SYSTEM PERFORMANCE OPTIMIZATION        " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Build Phase
Write-Host "[1/5] Building Optimized Artifacts..."
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
New-Item -ItemType Directory -Path "$TempDir" | Out-Null

# Build Client
Write-Host "   -> Building Optimized Frontend..."
Set-Location "$LocalProjectDir\client"
cmd /c "npm install && npm run build"
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend Build Failed"; exit 1 }

# Build Server
Write-Host "   -> Building Optimized Backend..."
Set-Location "$LocalProjectDir\server"
cmd /c "npm install && npm run build"
if ($LASTEXITCODE -ne 0) { Write-Error "Backend Build Failed"; exit 1 }

# 2. Package Phase
Write-Host "[2/5] Packaging Optimized Code..."
New-Item -ItemType Directory -Path "$TempDir\dist" | Out-Null
Copy-Item "$LocalProjectDir\server\dist\*" "$TempDir\dist" -Recurse
Copy-Item "$LocalProjectDir\server\package.json" "$TempDir\package.json"
Copy-Item "$LocalProjectDir\server\package-lock.json" "$TempDir\package-lock.json"
Copy-Item "$LocalProjectDir\server\prisma" "$TempDir\prisma" -Recurse
if (Test-Path "$TempDir\prisma\dev.db") { Remove-Item "$TempDir\prisma\dev.db" }

# Include Frontend in a 'public' folder
New-Item -ItemType Directory -Path "$TempDir\public" | Out-Null
Copy-Item "$LocalProjectDir\client\dist\*" "$TempDir\public" -Recurse

# Zip It
if (Test-Path $ZipFile) { Remove-Item $ZipFile }
Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipFile

# 3. Upload Phase
Write-Host "[3/5] Uploading Assets..."
scp $SSHOptions "$ZipFile" "${User}@${ServerIP}:/var/www/performance_update.zip"
scp $SSHOptions "$NginxLocalConfig" "${User}@${ServerIP}:/etc/nginx/sites-available/default"

# 4. Remote Execution
Write-Host "[4/5] Applying Optimizations Remotes..."
$RemoteScript = @"
#!/bin/bash
export PATH=`$PATH:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/bin:/sbin
[ -s "`$HOME/.nvm/nvm.sh" ] && \. "`$HOME/.nvm/nvm.sh"

set -e
APP_DIR="/var/www/antigravity"

echo "-> [Remote] Unpacking code to `$APP_DIR..."
mkdir -p `$APP_DIR
unzip -o -q /var/www/performance_update.zip -d `$APP_DIR

echo "-> [Remote] Installing production dependencies..."
cd `$APP_DIR
npm install --production --no-audit

echo "-> [Remote] Regenerating Prisma Client..."
npx prisma generate

echo "-> [Remote] Ensuring DB Symlinks are intact..."
# Link dev.db from purple-port to antigravity/prisma/dev.db
ln -sf /var/www/purple-port/server/prisma/dev.db `$APP_DIR/prisma/dev.db

echo "-> [Remote] Testing & Restarting Nginx for Gzip..."
nginx -t
systemctl restart nginx

echo "-> [Remote] Restarting PM2 with NEW environment..."
cd `$APP_DIR
pm2 delete antigravity-app || true
pm2 delete qix-backend || true
pm2 start dist/server.js --name "qix-backend" --env production
pm2 save

echo "✅ OPTIMIZATION COMPLETE!"
"@

$RemoteScript = $RemoteScript -replace "`r", ""
ssh $SSHOptions -t "$User@$ServerIP" "bash -c '$RemoteScript'"

# Cleanup
Set-Location "$LocalProjectDir"
Remove-Item $TempDir -Recurse -Force
Remove-Item $ZipFile
Write-Host "==========================================" -ForegroundColor Green
Write-Host "   SYSTEM OPTIMIZED & RESTARTED           " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
