$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$REMOTE_PATH = "/var/www/antigravity"
$PASS = "EzdanAdam@243"

Write-Host "🚀 Starting Posh-SSH Deployment..." -ForegroundColor Green

# 1. Build
Write-Host "Building Client..."
cd client; npm run build; cd ..
Write-Host "Building Server..."
cd server; npm run build; cd ..

# 2. Package
Write-Host "Packaging..."
$PACKAGE_DIR = "deploy_temp"
if (Test-Path $PACKAGE_DIR) { Remove-Item -Recurse -Force $PACKAGE_DIR }
New-Item -ItemType Directory -Path "$PACKAGE_DIR/client_dist" -Force | Out-Null
New-Item -ItemType Directory -Path "$PACKAGE_DIR/server_dist" -Force | Out-Null
Copy-Item -Path "client/dist\*" -Destination "$PACKAGE_DIR/client_dist" -Recurse -Force
Copy-Item -Path "server/dist\*" -Destination "$PACKAGE_DIR/server_dist" -Recurse -Force
New-Item -ItemType Directory -Path "$PACKAGE_DIR/server_dist/src" -Force | Out-Null
Copy-Item -Path "server/src\*" -Destination "$PACKAGE_DIR/server_dist/src" -Recurse -Force
Copy-Item -Path "server/package.json" -Destination "$PACKAGE_DIR/server_dist" -Force
New-Item -ItemType Directory -Path "$PACKAGE_DIR/server_dist/prisma" -Force | Out-Null
Copy-Item -Path "server/prisma/schema.prisma" -Destination "$PACKAGE_DIR/server_dist/prisma/" -Force

if (Test-Path "./deploy_package.zip") { Remove-Item "./deploy_package.zip" -Force }
tar.exe -a -c -f deploy_package.zip -C deploy_temp .
Remove-Item -Recurse -Force $PACKAGE_DIR

# 3. Upload and Deploy using Posh-SSH
Import-Module Posh-SSH -Force
$SecPass = ConvertTo-SecureString $PASS -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($SSH_USER, $SecPass)

Write-Host "Connecting and Uploading..."
$sftp = New-SFTPSession -ComputerName $SERVER_IP -Credential $Cred -AcceptKey -Force
Set-SFTPItem -SFTPSession $sftp -Path "./deploy_package.zip" -Destination "/tmp/deploy_package.zip" -Force
Remove-SFTPSession -SFTPSession $sftp | Out-Null

$session = New-SSHSession -ComputerName $SERVER_IP -Credential $Cred -AcceptKey -Force

$REMOTE_SCRIPT = "mkdir -p $REMOTE_PATH/updated_files && unzip -o /tmp/deploy_package.zip -d $REMOTE_PATH/updated_files/ && cp -r $REMOTE_PATH/updated_files/client_dist/* $REMOTE_PATH/client/dist/ && cp -r $REMOTE_PATH/updated_files/server_dist/* $REMOTE_PATH/server/dist/ && cp -r $REMOTE_PATH/updated_files/server_dist/src/* $REMOTE_PATH/server/src/ && cp $REMOTE_PATH/updated_files/server_dist/package.json $REMOTE_PATH/server/ && cd $REMOTE_PATH/server && npx prisma db push --accept-data-loss && pm2 restart qix-ads-v2.6 || pm2 start dist/server.js --name qix-ads-v2.6"

Invoke-SSHCommand -SSHSession $session -Command $REMOTE_SCRIPT
Remove-SSHSession -SSHSession $session | Out-Null

Remove-Item ./deploy_package.zip -Force
Write-Host "✅ Done!" -ForegroundColor Green
