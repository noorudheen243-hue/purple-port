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
$PACKAGE_DIR = "deploy_temp_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
mkdir $PACKAGE_DIR
mkdir "$PACKAGE_DIR/client_dist"
mkdir "$PACKAGE_DIR/server_dist"

# Copy Frontend Build
xcopy /E /I /Y "client/dist\*" "$PACKAGE_DIR/client_dist"

# Copy Backend Source & dist
xcopy /E /I /Y "server/dist\*" "$PACKAGE_DIR/server_dist"
copy "server/package.json" "$PACKAGE_DIR/server_dist"

# Include Data & Uploads
if (Test-Path "server/prisma/dev.db") {
    copy "server/prisma/dev.db" "$PACKAGE_DIR/server_dist/dev.db"
}
if (Test-Path "server/uploads") {
    xcopy /E /I /Y "server/uploads\*" "$PACKAGE_DIR/server_dist/uploads"
}
if (Test-Path "uploads") {
    xcopy /E /I /Y "uploads\*" "$PACKAGE_DIR/server_dist/root_uploads"
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
mkdir -p $REMOTE_PATH/server/dist
rm -rf $REMOTE_PATH/server/dist/*
cp -r $REMOTE_PATH/updated_files/server_dist/* $REMOTE_PATH/server/dist/
cp $REMOTE_PATH/updated_files/server_dist/package.json $REMOTE_PATH/server/

# Sync Database
if [ -f $REMOTE_PATH/updated_files/server_dist/dev.db ]; then
    cp $REMOTE_PATH/updated_files/server_dist/dev.db $REMOTE_PATH/server/prisma/dev.db
fi

# Sync Server Uploads
if [ -d $REMOTE_PATH/updated_files/server_dist/uploads ]; then
    mkdir -p $REMOTE_PATH/server/uploads
    cp -r $REMOTE_PATH/updated_files/server_dist/uploads/* $REMOTE_PATH/server/uploads/
fi

# Sync Root Uploads
if [ -d $REMOTE_PATH/updated_files/server_dist/root_uploads ]; then
    mkdir -p $REMOTE_PATH/uploads
    cp -r $REMOTE_PATH/updated_files/server_dist/root_uploads/* $REMOTE_PATH/uploads/
fi

echo "-> Restarting PM2..."
cd $REMOTE_PATH/server
pm2 restart qix-backend || pm2 start dist/server.js --name qix-backend
"@

ssh -i $KEY_PATH -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP $REMOTE_SCRIPT

# Step 5: Cleanup Local
Write-Host "[5/5] Final Cleanup..." -ForegroundColor Cyan
Remove-Item ./deploy_package.zip -Force

Write-Host "==========================================" -ForegroundColor Green
Write-Host "   PUSH COMPLETE! VPS IS UPDATED          " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
