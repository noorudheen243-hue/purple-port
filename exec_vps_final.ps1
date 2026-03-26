Import-Module Posh-SSH -Force
$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$PASS = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $PASS -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($SSH_USER, $SecPass)

# 1. Upload ZIP via SCP to /tmp/ folder
Write-Host "Uploading ZIP to /tmp/..."
Set-SCPItem -ComputerName $SERVER_IP -Credential $Cred -Path "f:\Antigravity\deploy_package.zip" -Destination "/tmp/" -Force

# 2. Upload Bash Script via base64
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
    unzip -o /tmp/deploy_package.zip -d $DIR/updated_files/
    
    echo "  -> Updating public/ assets"
    # Overwrite public folder with client_dist
    cp -r $DIR/updated_files/client_dist/* $DIR/public/
    
    echo "  -> Updating server dist"
    mkdir -p $DIR/server/dist
    cp -r $DIR/updated_files/server_dist/* $DIR/server/dist/
    cp $DIR/updated_files/server_dist/package.json $DIR/server/
    mkdir -p $DIR/server/prisma
    cp $DIR/updated_files/server_dist/prisma/schema.prisma $DIR/server/prisma/
    
    echo "  -> Prisma Push"
    cd $DIR/server && npx prisma db push --accept-data-loss && npx prisma generate
    
    echo "  -> PM2 Restart"
    pm2 restart $APP || (cd dist && pm2 start server.js --name $APP)
}

update_dir "/var/www/purple-port" "qix-ads-v2.7"
update_dir "/var/www/antigravity" "qix-ads-v2.6"

rm /tmp/deploy_package.zip
echo "🚀 DONE!"
'@

$b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($remoteScript))
$cmd = "echo '$b64' | base64 -d > /root/deploy_final.sh && chmod +x /root/deploy_final.sh && bash /root/deploy_final.sh"

$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host "LOG: " ($r.Output | Out-String)

Remove-SSHSession -SSHSession $session | Out-Null
Write-Host "✅ SCRIPT FINISHED"
