
# Deploy to BigRock VPS - Full Migration (Data + Code)
$ServerIP = "66.116.224.221"
$User = "root"
$TargetDir = "/var/www/purple-port" # Match existing Nginx config


$LocalProjectDir = "f:\Antigravity"
$TempDir = "$LocalProjectDir\deploy_temp_migration"
$ZipFile = "$LocalProjectDir\migration_package.zip"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   STARTING FULL MIGRATION TO $ServerIP   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Clean Previous Builds
Write-Host "[1/7] Cleaning previous assets..."
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
if (Test-Path $ZipFile) { Remove-Item $ZipFile -Force }

# 2. Build Client
Write-Host "[2/7] Building Frontend..."
Set-Location "$LocalProjectDir\client"
npm install
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend Build Failed!"; exit 1 }

# 3. Build Server
Write-Host "[3/7] Building Backend..."
Set-Location "$LocalProjectDir\server"
npm install
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Backend Build Failed!"; exit 1 }

# 4. Package for Deployment
Write-Host "[4/7] Packaging Files..."
New-Item -ItemType Directory -Path "$TempDir" | Out-Null
New-Item -ItemType Directory -Path "$TempDir\server" | Out-Null

# Copy Backend Code
Copy-Item "$LocalProjectDir\server\dist" "$TempDir\server\dist" -Recurse
Copy-Item "$LocalProjectDir\server\package.json" "$TempDir\server\package.json"
Copy-Item "$LocalProjectDir\server\prisma" "$TempDir\server\prisma" -Recurse
Copy-Item "$LocalProjectDir\server\.env" "$TempDir\server\.env"

# --- IMPORTANT: COPY DATA ---
Write-Host "   -> Copying Database (dev.db)..." -ForegroundColor Yellow
if (Test-Path "$LocalProjectDir\server\prisma\dev.db") {
    Copy-Item "$LocalProjectDir\server\prisma\dev.db" "$TempDir\server\prisma\dev.db"
}
else {
    Write-Warning "Database file not found! Deploying fresh DB."
}

Write-Host "   -> Copying Uploads..." -ForegroundColor Yellow
if (Test-Path "$LocalProjectDir\server\uploads") {
    Copy-Item "$LocalProjectDir\server\uploads" "$TempDir\server" -Recurse
}
# -----------------------------

# Copy Frontend to Server Public
Write-Host "   -> integrating Frontend..."
New-Item -ItemType Directory -Path "$TempDir\server\public" | Out-Null
Copy-Item "$LocalProjectDir\client\dist\*" "$TempDir\server\public" -Recurse

# Create Zip
Write-Host "[5/7] Zipping Package (This may take a moment)..."
Compress-Archive -Path "$TempDir\server\*" -DestinationPath $ZipFile

# 5. Upload to VPS
Write-Host "[6/7] Preparing Remote Directory..."
$KeyPath = "$PSScriptRoot\deploy_key"

# Explicitly pass arguments to avoid PowerShell string parsing issues
ssh -i "$KeyPath" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no "${User}@${ServerIP}" "mkdir -p /var/www"

Write-Host "      Uploading to VPS (Enter Password if prompted)..."
scp -i "$KeyPath" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no "$ZipFile" "${User}@${ServerIP}:/var/www/migration_package.zip"

if ($LASTEXITCODE -ne 0) { Write-Error "Upload Failed!"; exit 1 }

# 6. Remote Execution
Write-Host "[7/7] Executing Remote Deployment..."
$RemoteScript = @"
#!/bin/bash
# Load Environment
export PATH=`$PATH:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/bin:/sbin
[ -s "`$HOME/.nvm/nvm.sh" ] && \. "`$HOME/.nvm/nvm.sh"

set -e
echo "-> Stopping Services..."
pm2 delete all || true

echo "-> Wiping Old Data..."
rm -rf $TargetDir
# Reserve uploads/db before wipe? The script copies them fresh anyway.
mkdir -p $TargetDir

echo "-> Extracting Package..."
# Ensure unzip exists
if ! command -v unzip &> /dev/null; then
    apt-get update && apt-get install -y unzip
fi
unzip -o -q /var/www/migration_package.zip -d $TargetDir
rm /var/www/migration_package.zip

echo "-> Installing Dependencies..."
cd $TargetDir
npm install --production

echo "-> Generating Prisma Client..."
npx prisma generate

echo "-> Starting Server..."
# Ensure permissions on uploads/db
chmod -R 777 uploads || true
chmod 666 prisma/dev.db || true

pm2 start dist/server.js --name "antigravity-app" --env production
pm2 save

echo "✅ MIGRATION COMPLETE!"
"@

$RemoteScript = $RemoteScript -replace "`r", ""
# Use bash -l to ensure login shell environment if possible, but explicit export above handles it.
ssh -i "$KeyPath" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no -t "$User@$ServerIP" "bash -c '$RemoteScript'"

# Cleanup Local
Remove-Item $TempDir -Recurse -Force
Write-Host "==========================================" -ForegroundColor Green
Write-Host "   DEPLOYMENT SUCCESSFUL!                 " -ForegroundColor Green
Write-Host "   URL: http://$ServerIP                  " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
