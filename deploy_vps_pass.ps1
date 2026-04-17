# Push to Cloud Script (Sync to VPS) using Password
# Purpose: Build and Upload Code to VPS using plink/pscp

$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$PASSWORD = "EzdanAdam@243"
$REMOTE_PATH = "/var/www/purple-port"

Clear-Host
Write-Host "==========================================" -ForegroundColor Magenta
Write-Host "   STARTING LOCAL TO CLOUD PUSH (PASS)    " -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Magenta

# Step 1: Build Frontend
Write-Host "[1/5] Building Frontend..." -ForegroundColor Cyan
cd client
npm run build
cd ..

# Step 1.5: Build Backend
Write-Host "[1.5/5] Building Backend..." -ForegroundColor Cyan
cd server
npm run build
cd ..

# Step 2: Prepare Package
Write-Host "[2/5] Packaging Files..." -ForegroundColor Cyan
$PACKAGE_DIR = "deploy_temp"
if (Test-Path $PACKAGE_DIR) { Remove-Item -Recurse -Force $PACKAGE_DIR }
New-Item -ItemType Directory -Path "$PACKAGE_DIR/client_dist" -Force | Out-Null
New-Item -ItemType Directory -Path "$PACKAGE_DIR/server_dist" -Force | Out-Null

# Copy Frontend Build
if (Test-Path "client/dist") {
    Write-Host "-> Copying Frontend Build..."
    Copy-Item -Path "client/dist\*" -Destination "$PACKAGE_DIR/client_dist" -Recurse -Force
}

# Copy Backend Build (dist)
if (Test-Path "server/dist") {
    Write-Host "-> Copying Backend Build (dist)..."
    Copy-Item -Path "server/dist\*" -Destination "$PACKAGE_DIR/server_dist" -Recurse -Force
}
# Copy Backend Source (src)
if (Test-Path "server/src") {
    Write-Host "-> Copying Backend Source (src)..."
    New-Item -ItemType Directory -Path "$PACKAGE_DIR/server_dist/src" -Force | Out-Null
    Copy-Item -Path "server/src\*" -Destination "$PACKAGE_DIR/server_dist/src" -Recurse -Force
}
if (Test-Path "server/scripts") {
    Write-Host "-> Copying Backend Scripts..."
    New-Item -ItemType Directory -Path "$PACKAGE_DIR/server_dist/scripts" -Force | Out-Null
    Copy-Item -Path "server/scripts\*" -Destination "$PACKAGE_DIR/server_dist/scripts" -Recurse -Force
}
# Copy package.json
if (Test-Path "server/package.json") {
    Copy-Item -Path "server/package.json" -Destination "$PACKAGE_DIR/server_dist" -Force
}
# Copy Prisma Schema
if (Test-Path "server/prisma") {
    Write-Host "-> Copying Prisma Schema..."
    New-Item -ItemType Directory -Path "$PACKAGE_DIR/server_dist/prisma" -Force | Out-Null
    Copy-Item -Path "server/prisma/schema.prisma" -Destination "$PACKAGE_DIR/server_dist/prisma/" -Force
}

if (Test-Path "./deploy_package.zip") { Remove-Item "./deploy_package.zip" -Force }
tar.exe -a -c -f deploy_package.zip -C deploy_temp .
Remove-Item -Recurse -Force $PACKAGE_DIR

# Step 3: Upload to VPS using pscp
Write-Host "[3/5] Uploading to VPS..." -ForegroundColor Cyan
# Using echo y to accept host key if needed
echo y | & "C:\Program Files\PuTTY\pscp.exe" -pw $PASSWORD ./deploy_package.zip "$SSH_USER@$SERVER_IP`:/root/"

# Step 4: Extract and Deploy on VPS using plink
Write-Host "[4/5] Running Remote Deployment Script..." -ForegroundColor Cyan
$REMOTE_SCRIPT = @"
mkdir -p $REMOTE_PATH/updated_files
rm -rf $REMOTE_PATH/updated_files/*
unzip -o /root/deploy_package.zip -d $REMOTE_PATH/updated_files/
rm /root/deploy_package.zip

echo "-> Updating Frontend..."
mkdir -p $REMOTE_PATH/client/dist
rm -rf $REMOTE_PATH/client/dist/*
cp -r $REMOTE_PATH/updated_files/client_dist/* $REMOTE_PATH/client/dist/

echo "-> Updating Backend & Data..."
mkdir -p $REMOTE_PATH/server/dist
rm -rf $REMOTE_PATH/server/dist/*
cp -r $REMOTE_PATH/updated_files/server_dist/* $REMOTE_PATH/server/dist/

if [ -d $REMOTE_PATH/updated_files/server_dist/src ]; then
    echo "-> Updating Backend Source..."
    mkdir -p $REMOTE_PATH/server/src
    rm -rf $REMOTE_PATH/server/src/*
    cp -r $REMOTE_PATH/updated_files/server_dist/src/* $REMOTE_PATH/server/src/
fi



if [ -d $REMOTE_PATH/updated_files/server_dist/prisma ]; then
    echo "-> Updating Prisma Schema..."
    mkdir -p $REMOTE_PATH/server/prisma
    cp $REMOTE_PATH/updated_files/server_dist/prisma/schema.prisma $REMOTE_PATH/server/prisma/
fi

if [ -d $REMOTE_PATH/updated_files/server_dist/scripts ]; then
    echo "-> Updating Backend Scripts..."
    mkdir -p $REMOTE_PATH/server/scripts
    rm -rf $REMOTE_PATH/server/scripts/*
    cp -r $REMOTE_PATH/updated_files/server_dist/scripts/* $REMOTE_PATH/server/scripts/
fi

cp $REMOTE_PATH/updated_files/server_dist/package.json $REMOTE_PATH/server/

echo "-> Applying Database Schema Changes..."
cd $REMOTE_PATH/server
npx prisma db push --accept-data-loss

echo "-> Running Content Migration..."
npx ts-node scripts/migrate-content-types.ts

echo "-> Restarting PM2..."
pm2 restart qix-ads-v2.7
"@

# Fix CRLF to LF for Linux
$REMOTE_SCRIPT = $REMOTE_SCRIPT -replace "`r`n", "`n"

echo y | & "C:\Program Files\PuTTY\plink.exe" -pw $PASSWORD $SSH_USER@$SERVER_IP $REMOTE_SCRIPT

# Step 5: Cleanup Local
Write-Host "[5/5] Final Cleanup..." -ForegroundColor Cyan
Remove-Item ./deploy_package.zip -Force

Write-Host "==========================================" -ForegroundColor Green
Write-Host "   PUSH COMPLETE! VPS IS UPDATED          " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
