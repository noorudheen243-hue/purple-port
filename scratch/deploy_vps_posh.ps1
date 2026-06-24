# Local to Cloud Deployment Script using Posh-SSH
# Target: root@66.116.224.221 /var/www/purple-port

Import-Module Posh-SSH -Force

$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$PASS = "EzdanAdam@243"
$REMOTE_PATH = "/var/www/purple-port"

Write-Host "==========================================" -ForegroundColor Magenta
Write-Host "   STARTING POSH-SSH VPS DEPLOYMENT       " -ForegroundColor Magenta
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

# Copy Backend Source & dist
if (Test-Path "server/dist") {
    Write-Host "-> Copying Backend Build (dist)..."
    Copy-Item -Path "server/dist\*" -Destination "$PACKAGE_DIR/server_dist" -Recurse -Force
}
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
if (Test-Path "server/package.json") {
    Copy-Item -Path "server/package.json" -Destination "$PACKAGE_DIR/server_dist" -Force
}
if (Test-Path "server/prisma") {
    Write-Host "-> Copying Prisma Schema..."
    New-Item -ItemType Directory -Path "$PACKAGE_DIR/server_dist/prisma" -Force | Out-Null
    Copy-Item -Path "server/prisma/schema.prisma" -Destination "$PACKAGE_DIR/server_dist/prisma/" -Force
}

if (Test-Path "./deploy_package.zip") { Remove-Item "./deploy_package.zip" -Force }
tar.exe -a -c -f deploy_package.zip -C deploy_temp .
Remove-Item -Recurse -Force $PACKAGE_DIR

# Connect to VPS
Write-Host "[3/5] Connecting to VPS..." -ForegroundColor Cyan
$SecPass = ConvertTo-SecureString $PASS -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($SSH_USER, $SecPass)

try {
    $session = New-SSHSession -ComputerName $SERVER_IP -Credential $Cred -AcceptKey -Force
    if (-not $session) { throw "SSH Session failed to open." }
    $sftpSession = New-SFTPSession -ComputerName $SERVER_IP -Credential $Cred -AcceptKey -Force
    if (-not $sftpSession) { throw "SFTP Session failed to open." }

    # Upload files
    Write-Host "-> Uploading deploy_package.zip..." -ForegroundColor Yellow
    Set-SFTPItem -SFTPSession $sftpSession -Path "./deploy_package.zip" -Destination "/root/" -Force
    
    Write-Host "-> Uploading nginx_vps_updated.conf..." -ForegroundColor Yellow
    Set-SFTPItem -SFTPSession $sftpSession -Path "./scratch/nginx_vps_updated.conf" -Destination "/root/" -Force

    Remove-SFTPSession $sftpSession | Out-Null
    
    # Run Remote Deployment Command Block
    Write-Host "[4/5] Running Remote Deployment Commands..." -ForegroundColor Cyan
    
    $remoteScript = @"
echo "-> Backing up Nginx default configuration..."
cp /etc/nginx/sites-enabled/default /root/default_nginx_backup_crm

echo "-> Updating Nginx default configuration..."
cp /root/nginx_vps_updated.conf /etc/nginx/sites-enabled/default
rm /root/nginx_vps_updated.conf

echo "-> Testing Nginx configuration..."
if nginx -t; then
    echo "-> Nginx config is valid. Reloading..."
    systemctl reload nginx
else
    echo "-> WARNING: Nginx config has errors. Restoring backup..."
    cp /root/default_nginx_backup_crm /etc/nginx/sites-enabled/default
    systemctl reload nginx
fi

echo "-> Extracting deploy package..."
mkdir -p $REMOTE_PATH/updated_files
rm -rf $REMOTE_PATH/updated_files/*
unzip -o /root/deploy_package.zip -d $REMOTE_PATH/updated_files/
rm /root/deploy_package.zip

echo "-> Updating Frontend..."
mkdir -p $REMOTE_PATH/client/dist
rm -rf $REMOTE_PATH/client/dist/*
cp -r $REMOTE_PATH/updated_files/client_dist/* $REMOTE_PATH/client/dist/

echo "-> Updating Backend dist..."
mkdir -p $REMOTE_PATH/server/dist
rm -rf $REMOTE_PATH/server/dist/*
cp -r $REMOTE_PATH/updated_files/server_dist/* $REMOTE_PATH/server/dist/

if [ -d $REMOTE_PATH/updated_files/server_dist/src ]; then
    echo "-> Updating Backend src..."
    mkdir -p $REMOTE_PATH/server/src
    rm -rf $REMOTE_PATH/server/src/*
    cp -r $REMOTE_PATH/updated_files/server_dist/src/* $REMOTE_PATH/server/src/
fi

if [ -d $REMOTE_PATH/updated_files/server_dist/scripts ]; then
    echo "-> Updating Backend scripts..."
    mkdir -p $REMOTE_PATH/server/scripts
    rm -rf $REMOTE_PATH/server/scripts/*
    cp -r $REMOTE_PATH/updated_files/server_dist/scripts/* $REMOTE_PATH/server/scripts/
fi

if [ -d $REMOTE_PATH/updated_files/server_dist/prisma ]; then
    echo "-> Updating Prisma Schema..."
    mkdir -p $REMOTE_PATH/server/prisma
    cp $REMOTE_PATH/updated_files/server_dist/prisma/schema.prisma $REMOTE_PATH/server/prisma/
fi

cp $REMOTE_PATH/updated_files/server_dist/package.json $REMOTE_PATH/server/
rm -rf $REMOTE_PATH/updated_files

echo "-> Installing dependencies and pushing prisma schema changes..."
cd $REMOTE_PATH/server
npm install
npx prisma generate
npx prisma db push --accept-data-loss

echo "-> Restarting PM2 process..."
pm2 restart qix-api || pm2 start dist/server.js --name qix-api

echo "-> VPS DEPLOYMENT COMPLETED SUCCESSFULLY!"
"@
    
    # Fix CRLF to LF for Linux execution
    $remoteScript = $remoteScript -replace "`r`n", "`n"
    
    $res = Invoke-SSHCommand -SSHSession $session -Command $remoteScript
    
    Write-Host "`n=== VPS Deployment Output ===" -ForegroundColor Green
    Write-Host $res.Output -ForegroundColor White
    
    if ($res.Error) {
        Write-Host "`n=== VPS Deployment Warnings/Errors ===" -ForegroundColor Red
        Write-Host $res.Error -ForegroundColor Red
    }

} catch {
    Write-Error "Deployment Exception: $_"
} finally {
    if ($session) { Remove-SSHSession -SSHSession $session | Out-Null }
    if (Test-Path "./deploy_package.zip") { Remove-Item "./deploy_package.zip" -Force }
    Write-Host "[5/5] Completed and cleaned up local files." -ForegroundColor Cyan
}
