Import-Module Posh-SSH -Force
$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$PASS = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $PASS -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($SSH_USER, $SecPass)

Write-Host "Re-building Server..."
Set-Location -Path "f:\Antigravity\server"
npm run build
Set-Location -Path "f:\Antigravity"

Write-Host "Packaging..."
Remove-Item -Recurse -Force deploy_temp -ErrorAction SilentlyContinue
mkdir deploy_temp | Out-Null
mkdir deploy_temp/server_dist | Out-Null
Copy-Item -Path "server/dist\*" -Destination "deploy_temp/server_dist" -Recurse -Force
mkdir deploy_temp/server_dist/src | Out-Null
Copy-Item -Path "server/src\*" -Destination "deploy_temp/server_dist/src" -Recurse -Force
Copy-Item -Path "server/package.json" -Destination "deploy_temp/server_dist" -Force
mkdir deploy_temp/server_dist/prisma | Out-Null
Copy-Item -Path "server/prisma/schema.prisma" -Destination "deploy_temp/server_dist/prisma/" -Force

if (Test-Path "./deploy_package_server.zip") { Remove-Item "./deploy_package_server.zip" -Force }
tar.exe -a -c -f deploy_package_server.zip -C deploy_temp .

Write-Host "Uploading ZIP to /tmp/... Using SFTP this time"
$sftpSession = New-SFTPSession -ComputerName $SERVER_IP -Credential $Cred -AcceptKey -Force
Set-SFTPItem -SFTPSession $sftpSession -Path "f:\Antigravity\deploy_package_server.zip" -Destination "/tmp/" -Force
Remove-SFTPSession -SFTPSession $sftpSession | Out-Null

Write-Host "Deploying on Remote Support..."
$session = New-SSHSession -ComputerName $SERVER_IP -Credential $Cred -AcceptKey -Force

$remoteScript = @'
#!/bin/bash
update_dir() {
    DIR=$1
    APP=$2
    echo "🎯 TARGET: $DIR ($APP)"
    if [ ! -d "$DIR" ]; then 
        echo "Dir $DIR not found, skipping"
        return
    fi
    mkdir -p $DIR/updated_files
    rm -rf $DIR/updated_files/*
    unzip -o /tmp/deploy_package_server.zip -d $DIR/updated_files/
    
    echo "  -> Force Stopping PM2 APP"
    pm2 stop $APP || true
    
    echo "  -> Force Clearing OLD server dist"
    rm -rf $DIR/server/dist
    mkdir -p $DIR/server/dist
    
    echo "  -> Copying NEW server dist"
    cp -r $DIR/updated_files/server_dist/* $DIR/server/dist/
    cp $DIR/updated_files/server_dist/package.json $DIR/server/
    mkdir -p $DIR/server/prisma
    cp $DIR/updated_files/server_dist/prisma/schema.prisma $DIR/server/prisma/
    
    echo "  -> Prisma Generate & PM2 Restart"
    cd $DIR/server && npx prisma db push --accept-data-loss && npx prisma generate
    pm2 start dist/server.js --name $APP --update-env || pm2 restart $APP --update-env
}

update_dir "/var/www/purple-port" "qix-ads-v2.7"
update_dir "/var/www/antigravity" "qix-ads-v2.6"

rm /tmp/deploy_package_server.zip
pm2 save
echo "🚀 SCRIPT COMPLETE!"
'@

$b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($remoteScript))
$cmd = "echo '$b64' | base64 -d > /root/deploy_force.sh && chmod +x /root/deploy_force.sh && bash /root/deploy_force.sh"

$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host "LOG: " ($r.Output | Out-String)

Remove-SSHSession -SSHSession $session | Out-Null
Write-Host "✅ ALL FINISHED"
