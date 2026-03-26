# Posh-SSH Based Performance Optimizer & Deployer
Import-Module Posh-SSH -Force
$ServerIP = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$LocalProjectDir = "f:\Antigravity"
$TempDir = "$LocalProjectDir\deploy_temp_optimized"
$ZipFile = "$LocalProjectDir\performance_update.zip"
$NginxLocalConfig = "$LocalProjectDir\nginx_optimized.conf"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   SYSTEM PERFORMANCE OPTIMIZATION (POSH) " -ForegroundColor Cyan
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

# 3. Connection & Upload
Write-Host "[3/5] Connecting and Uploading..."
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

# Create SSH Session for commands
$s = New-SSHSession -ComputerName $ServerIP -Credential $Cred -AcceptKey -Force

# Create SFTP Session for uploads
$sftp = New-SFTPSession -ComputerName $ServerIP -Credential $Cred -AcceptKey -Force

# Upload using SFTP (Posh-SSH)
# For single files, the destination should be the directory
Set-SFTPItem -SessionId $sftp.SessionId -Path $ZipFile -Destination "/var/www" -Force
Set-SFTPItem -SessionId $sftp.SessionId -Path $NginxLocalConfig -Destination "/tmp" -Force

Remove-SFTPSession -SessionId $sftp.SessionId | Out-Null

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
ln -sf /var/www/purple-port/server/prisma/dev.db `$APP_DIR/prisma/dev.db

echo "-> [Remote] Moving Nginx config to sites-available..."
mv /tmp/nginx_optimized.conf /etc/nginx/sites-available/default

echo "-> [Remote] Testing & Restarting Nginx for Gzip..."
nginx -t
systemctl restart nginx

echo "-> [Remote] Restarting PM2 with NEW environment..."
cd `$APP_DIR
pm2 delete qix-backend || true
pm2 start dist/server.js --name "qix-backend" --env production
pm2 save

echo "✅ OPTIMIZATION COMPLETE!"
"@

# Fix CRLF
$RemoteScript = $RemoteScript -replace "`r", ""

$result = Invoke-SSHCommand -SessionId $s.SessionId -Command $RemoteScript -TimeOut 300
if ($result.Output) { Write-Host $result.Output -ForegroundColor White }
if ($result.Error) { Write-Host "ERR: $($result.Error)" -ForegroundColor Yellow }

# 5. Cleanup
Remove-SSHSession -SessionId $s.SessionId | Out-Null
Set-Location "$LocalProjectDir"
Remove-Item $TempDir -Recurse -Force
Remove-Item $ZipFile
Write-Host "==========================================" -ForegroundColor Green
Write-Host "   SYSTEM OPTIMIZED & RESTARTED (POSH)    " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
