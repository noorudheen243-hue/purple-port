# Push to Cloud Script (Sync to VPS)
# Purpose: Build and Upload Code, Database, and ALL Uploads to VPS

$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$REMOTE_PATH = "/var/www/purple-port"
$KEY_PATH = "f:\Antigravity\deploy_key"

Clear-Host
Write-Host "==========================================" -ForegroundColor Magenta
Write-Host "   STARTING LOCAL TO CLOUD PUSH (SYNC)    " -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Magenta

# Step 1: Build Frontend
Write-Host "[1/5] Building Frontend..." -ForegroundColor Cyan
cd client
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

# Copy Backend Source & dist
if (Test-Path "server/dist") {
    Write-Host "-> Copying Backend Build..."
    Copy-Item -Path "server/dist\*" -Destination "$PACKAGE_DIR/server_dist" -Recurse -Force
}
if (Test-Path "server/package.json") {
    Copy-Item -Path "server/package.json" -Destination "$PACKAGE_DIR/server_dist" -Force
}

# Include Data & Uploads
if (Test-Path "server/prisma/dev.db") {
    Write-Host "-> Including Database..."
    Copy-Item -Path "server/prisma/dev.db" -Destination "$PACKAGE_DIR/server_dist/dev.db" -Force
}
if (Test-Path "server/uploads") {
    Write-Host "-> Including Server Uploads..."
    New-Item -ItemType Directory -Path "$PACKAGE_DIR/server_dist/uploads" -Force | Out-Null
    Copy-Item -Path "server/uploads\*" -Destination "$PACKAGE_DIR/server_dist/uploads" -Recurse -Force
}
if (Test-Path "uploads") {
    Write-Host "-> Including Root Uploads..."
    New-Item -ItemType Directory -Path "$PACKAGE_DIR/server_dist/root_uploads" -Force | Out-Null
    Copy-Item -Path "uploads\*" -Destination "$PACKAGE_DIR/server_dist/root_uploads" -Recurse -Force
}

# Zip it
Compress-Archive -Path "$PACKAGE_DIR\*" -DestinationPath "./deploy_package.zip" -Force
Remove-Item -Recurse -Force $PACKAGE_DIR

# Step 3: Upload to VPS
Write-Host "[3/5] Uploading to VPS..." -ForegroundColor Cyan
scp -i $KEY_PATH -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no ./deploy_package.zip "$SSH_USER@$SERVER_IP`:/root/"

# Step 4: Extract and Deploy on VPS
Write-Host "[4/5] Running Remote Deployment Script..." -ForegroundColor Cyan
$REMOTE_SCRIPT = @"
mkdir -p $REMOTE_PATH/updated_files
rm -rf $REMOTE_PATH/updated_files/*
unzip /root/deploy_package.zip -d $REMOTE_PATH/updated_files/
rm /root/deploy_package.zip

echo "-> Updating Frontend..."
mkdir -p $REMOTE_PATH/client/dist
rm -rf $REMOTE_PATH/client/dist/*
cp -r $REMOTE_PATH/updated_files/client_dist/* $REMOTE_PATH/client/dist/

echo "-> Updating Backend & Data..."
# We copy to server/dist, but we need to ensure uploads don't end up inside dist
mkdir -p $REMOTE_PATH/server/dist
rm -rf $REMOTE_PATH/server/dist/*
# Copy everything EXCEPT root_uploads and uploads from the temp package to dist
cp -r $REMOTE_PATH/updated_files/server_dist/* $REMOTE_PATH/server/dist/

# Now move the specific data files to the correct parent folder
cp $REMOTE_PATH/updated_files/server_dist/package.json $REMOTE_PATH/server/

# Sync Database (to server/prisma/)
if [ -f $REMOTE_PATH/updated_files/server_dist/dev.db ]; then
    mkdir -p $REMOTE_PATH/server/prisma
    cp $REMOTE_PATH/updated_files/server_dist/dev.db $REMOTE_PATH/server/prisma/dev.db
fi

# Sync Server Uploads (to server/uploads/)
if [ -d $REMOTE_PATH/updated_files/server_dist/uploads ]; then
    mkdir -p $REMOTE_PATH/server/uploads
    cp -r $REMOTE_PATH/updated_files/server_dist/uploads/* $REMOTE_PATH/server/uploads/
fi

# Sync Root Uploads (to /uploads/)
if [ -d $REMOTE_PATH/updated_files/server_dist/root_uploads ]; then
    mkdir -p $REMOTE_PATH/uploads
    cp -r $REMOTE_PATH/updated_files/server_dist/root_uploads/* $REMOTE_PATH/uploads/
fi

# Cleanup: if uploads folder was copied into dist by accident, remove it
rm -rf $REMOTE_PATH/server/dist/uploads
rm -rf $REMOTE_PATH/server/dist/root_uploads
rm -f $REMOTE_PATH/server/dist/dev.db
rm -f $REMOTE_PATH/server/dist/package.json

echo "-> Restarting PM2..."
cd $REMOTE_PATH/server
pm2 restart qix-backend || pm2 start dist/server.js --name qix-backend
"@

# Fix CRLF to LF for Linux
$REMOTE_SCRIPT = $REMOTE_SCRIPT -replace "`r`n", "`n"

ssh -i $KEY_PATH -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP $REMOTE_SCRIPT

# Step 5: Cleanup Local
Write-Host "[5/5] Final Cleanup..." -ForegroundColor Cyan
Remove-Item ./deploy_package.zip -Force

Write-Host "==========================================" -ForegroundColor Green
Write-Host "   PUSH COMPLETE! VPS IS UPDATED          " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
