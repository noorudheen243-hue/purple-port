Import-Module Posh-SSH -Force
$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$PASS = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $PASS -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($SSH_USER, $SecPass)

Write-Host "Updating .env files on VPS..."
$session = New-SSHSession -ComputerName $SERVER_IP -Credential $Cred -AcceptKey -Force

$remoteScript = @'
#!/bin/bash
update_env() {
    FILE=$1
    if [ ! -f "$FILE" ]; then 
        echo "File $FILE not found, skipping"
        return
    fi
    echo "🎯 UPDATING: $FILE"
    
    # Check if the line already exists
    if grep -q "MARKETING_ENGINE_ENABLED" "$FILE"; then
        sed -i 's/MARKETING_ENGINE_ENABLED=.*/MARKETING_ENGINE_ENABLED="true"/' "$FILE"
    else
        echo 'MARKETING_ENGINE_ENABLED="true"' >> "$FILE"
    fi
}

update_env "/var/www/purple-port/server/.env"
update_env "/var/www/antigravity/server/.env"

echo "  -> Restarting PM2 processes with updated environment variables"
pm2 restart all --update-env
pm2 save
echo "🚀 VPS UPDATE COMPLETE!"
'@

$b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($remoteScript))
$cmd = "echo '$b64' | base64 -d > /root/update_marketing_flag.sh && chmod +x /root/update_marketing_flag.sh && bash /root/update_marketing_flag.sh"

$r = Invoke-SSHCommand -SSHSession $session -Command $cmd
Write-Host "LOG: " ($r.Output | Out-String)

Remove-SSHSession -SSHSession $session | Out-Null
Write-Host "✅ ALL FINISHED"
