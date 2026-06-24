Import-Module Posh-SSH -Force

$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$PASS = "EzdanAdam@243"

$SecPass = ConvertTo-SecureString $PASS -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($SSH_USER, $SecPass)

try {
    Write-Host "Connecting to VPS..."
    $session = New-SSHSession -ComputerName $SERVER_IP -Credential $Cred -AcceptKey -Force
    $sftpSession = New-SFTPSession -ComputerName $SERVER_IP -Credential $Cred -AcceptKey -Force

    Write-Host "Uploading updated Nginx configuration..."
    Set-SFTPItem -SFTPSession $sftpSession -Path "./scratch/nginx_vps_updated.conf" -Destination "/root/" -Force
    Remove-SFTPSession $sftpSession | Out-Null

    $remoteScript = @'
echo "-> Backing up old configuration..."
cp /etc/nginx/sites-enabled/default /root/default_nginx_backup_crm_v2

echo "-> Installing new Nginx configuration..."
cp /root/nginx_vps_updated.conf /etc/nginx/sites-enabled/default
rm /root/nginx_vps_updated.conf

echo "-> Testing Nginx..."
if nginx -t; then
    echo "-> Configuration ok. Reloading Nginx..."
    systemctl reload nginx
else
    echo "-> WARNING: Configuration invalid. Restoring backup..."
    cp /root/default_nginx_backup_crm_v2 /etc/nginx/sites-enabled/default
    systemctl reload nginx
fi
'@

    $res = Invoke-SSHCommand -SSHSession $session -Command $remoteScript
    Write-Host $res.Output
} catch {
    Write-Error $_
} finally {
    if ($session) { Remove-SSHSession -SSHSession $session | Out-Null }
}
