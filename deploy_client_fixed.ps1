Import-Module Posh-SSH -Force
$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$PASS = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $PASS -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($SSH_USER, $SecPass)

$localDist = "f:\Antigravity\client\dist"
$localZip = "f:\Antigravity\client_deploy_fixed.zip"
$remoteZip = "/tmp/client_deploy_fixed.zip"
$remoteDest = "/var/www/purple-port/client/dist"

Write-Host "Zipping $localDist..."
if (Test-Path $localZip) { Remove-Item $localZip }
Compress-Archive -Path "$localDist\*" -DestinationPath $localZip

Write-Host "Creating SSH session..."
$session = New-SSHSession -ComputerName $SERVER_IP -Credential $Cred -AcceptKey -Force

Write-Host "Uploading $localZip to $remoteZip..."
$sftpSession = New-SFTPSession -ComputerName $SERVER_IP -Credential $Cred -AcceptKey -Force
Set-SFTPItem -SFTPSession $sftpSession -Path $localZip -Destination "/tmp/"
Remove-SFTPSession $sftpSession

Write-Host "Extracting on VPS to $remoteDest..."
# mkdir -p $remoteDest && rm -rf $remoteDest/* && unzip -o $remoteZip -d $remoteDest && rm $remoteZip
Invoke-SSHCommand -SSHSession $session -Command "mkdir -p $remoteDest && rm -rf $remoteDest/* && unzip -o $remoteZip -d $remoteDest && rm $remoteZip"

Write-Host "Reloading Nginx..."
Invoke-SSHCommand -SSHSession $session -Command "nginx -s reload"

Write-Host "Frontend Deployment (Fixed Path) Complete!"
Remove-SSHSession $session
Remove-Item $localZip
