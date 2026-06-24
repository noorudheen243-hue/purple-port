Import-Module Posh-SSH -Force

$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$PASSWORD = "EzdanAdam@243"
$REMOTE_PATH = "/var/www/purple-port"
$ZIP_FILE = "f:\Antigravity\deploy_package.zip"

Write-Host "==========================================" -ForegroundColor Magenta
Write-Host "   STARTING DEPLOY VIA POSH-SSH           " -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Magenta

# Step 1: Prepare Package
Write-Host "[1/4] Packaging Files..." -ForegroundColor Cyan
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

if (Test-Path $ZIP_FILE) { Remove-Item $ZIP_FILE -Force }
tar.exe -a -c -f $ZIP_FILE -C $PACKAGE_DIR .
Remove-Item -Recurse -Force $PACKAGE_DIR

# Step 2: Connect to VPS
Write-Host "[2/4] Connecting to VPS ($SERVER_IP)..." -ForegroundColor Cyan
$SecPass = ConvertTo-SecureString $PASSWORD -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($SSH_USER, $SecPass)
$Session = New-SSHSession -ComputerName $SERVER_IP -Credential $Cred -AcceptKey -Force -ErrorAction Stop
Write-Host "   SSH connected. SessionId: $($Session.SessionId)" -ForegroundColor Green

# Step 3: Upload via SFTP
Write-Host "[3/4] Uploading package via SFTP..." -ForegroundColor Cyan
$SFTPSession = New-SFTPSession -ComputerName $SERVER_IP -Credential $Cred -AcceptKey -Force -ErrorAction Stop
Set-SFTPItem -SessionId $SFTPSession.SessionId -Path $ZIP_FILE -Destination "/root" -Force
Remove-SFTPSession -SessionId $SFTPSession.SessionId | Out-Null
Write-Host "   Upload complete." -ForegroundColor Green

# Step 4: Extract and Deploy on VPS
Write-Host "[4/4] Running Remote Deployment Script..." -ForegroundColor Cyan
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

# Move src folder to server/src
if [ -d $REMOTE_PATH/updated_files/server_dist/src ]; then
    echo "-> Updating Backend Source..."
    mkdir -p $REMOTE_PATH/server/src
    rm -rf $REMOTE_PATH/server/src/*
    cp -r $REMOTE_PATH/updated_files/server_dist/src/* $REMOTE_PATH/server/src/
fi

if [ -d $REMOTE_PATH/updated_files/server_dist/scripts ]; then
    echo "-> Updating Backend Scripts..."
    mkdir -p $REMOTE_PATH/server/scripts
    rm -rf $REMOTE_PATH/server/scripts/*
    cp -r $REMOTE_PATH/updated_files/server_dist/scripts/* $REMOTE_PATH/server/scripts/
fi

# Move prisma folder
if [ -d $REMOTE_PATH/updated_files/server_dist/prisma ]; then
    echo "-> Updating Prisma Schema..."
    mkdir -p $REMOTE_PATH/server/prisma
    cp $REMOTE_PATH/updated_files/server_dist/prisma/schema.prisma $REMOTE_PATH/server/prisma/
fi

cp $REMOTE_PATH/updated_files/server_dist/package.json $REMOTE_PATH/server/

# Ensure .env exists in server folder (if it exists in parent)
if [ ! -f $REMOTE_PATH/server/.env ] && [ -f $REMOTE_PATH/.env ]; then
    cp $REMOTE_PATH/.env $REMOTE_PATH/server/.env
fi

echo "-> Applying Database Schema Changes..."
cd $REMOTE_PATH/server
npx prisma db push --accept-data-loss

echo "-> Running Content Management Migration..."
npx ts-node scripts/migrate-content-types.ts

echo "-> Restarting PM2..."
pm2 restart qix-api || pm2 restart all || pm2 start dist/server.js --name qix-api

echo 'SUCCESS'
"@

# Fix CRLF to LF for Linux
$REMOTE_SCRIPT = $REMOTE_SCRIPT -replace "`r`n", "`n"

$result = Invoke-SSHCommand -SessionId $Session.SessionId -Command $REMOTE_SCRIPT -TimeOut 300
Write-Host $result.Output -ForegroundColor White
if ($result.Error) {
    Write-Host "ERR: $($result.Error)" -ForegroundColor Red
}

Remove-SSHSession -SessionId $Session.SessionId | Out-Null

# Cleanup Local
if (Test-Path $ZIP_FILE) { Remove-Item $ZIP_FILE -Force }

Write-Host "==========================================" -ForegroundColor Green
Write-Host "   PUSH COMPLETE! VPS IS UPDATED          " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
