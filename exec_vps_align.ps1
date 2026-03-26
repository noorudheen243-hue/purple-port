Import-Module Posh-SSH -Force
$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$PASS = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $PASS -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($SSH_USER, $SecPass)

Write-Host "Deploying Path Alignment Fix to Remote Server..."
$session = New-SSHSession -ComputerName $SERVER_IP -Credential $Cred -AcceptKey -Force

$remoteScript = @'
#!/bin/bash
align_dir() {
    DIR=$1
    APP=$2
    echo "🎯 ALIGNING: $DIR ($APP)"
    if [ ! -d "$DIR" ]; then 
        echo "Dir $DIR not found, skipping"
        return
    fi
    
    echo "  -> Removing legacy dist at $DIR/dist"
    rm -rf $DIR/dist
    
    echo "  -> Forcing PM2 to point to correct server/dist"
    pm2 delete $APP || true
    
    cd $DIR/server
    pm2 start dist/server.js --name $APP --update-env
}

align_dir "/var/www/purple-port" "qix-ads-v2.7"
align_dir "/var/www/antigravity" "qix-ads-v2.6"

pm2 save
echo "🚀 ALIGNMENT SCRIPT COMPLETE!"
'@

$b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($remoteScript))
$cmd = "echo '$b64' | base64 -d > /root/align_force.sh && chmod +x /root/align_force.sh && bash /root/align_force.sh"

$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host "LOG: " ($r.Output | Out-String)

Remove-SSHSession -SSHSession $session | Out-Null
Write-Host "✅ ALL FINISHED"
