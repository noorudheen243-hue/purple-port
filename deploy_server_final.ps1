Import-Module Posh-SSH -Force
$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$PASS = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $PASS -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($SSH_USER, $SecPass)

$localDist = "f:\Antigravity\server\dist"
$localZip = "f:\Antigravity\server_deploy_final.zip"
$remoteZip = "/tmp/server_deploy_final.zip"
$remoteDest = "/var/www/purple-port/server/dist"

Write-Host "Zipping $localDist..."
if (Test-Path $localZip) { Remove-Item $localZip }
Compress-Archive -Path "$localDist\*" -DestinationPath $localZip

Write-Host "Creating SSH session..."
$session = New-SSHSession -ComputerName $SERVER_IP -Credential $Cred -AcceptKey -Force

Write-Host "Removing old zip and cleaning target on VPS..."
Invoke-SSHCommand -SSHSession $session -Command "rm -f $remoteZip && mkdir -p $remoteDest && rm -rf $remoteDest/*"

Write-Host "Uploading $localZip to $remoteZip..."
$sftpSession = New-SFTPSession -ComputerName $SERVER_IP -Credential $Cred -AcceptKey -Force
Set-SFTPItem -SFTPSession $sftpSession -Path $localZip -Destination "/tmp/"
Remove-SFTPSession $sftpSession

Write-Host "Extracting on VPS to $remoteDest..."
Invoke-SSHCommand -SSHSession $session -Command "unzip -o -q $remoteZip -d $remoteDest && rm $remoteZip"

Write-Host "Restarting PM2 Service..."
# App name found earlier: qix-ads-v2.7
Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.7"

Write-Host "Server Deployment Complete!"
Remove-SSHSession $session
Remove-Item $localZip
