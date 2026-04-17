Import-Module Posh-SSH -Force
$SERVER_IP = "66.116.224.221"
$SSH_USER = "root"
$PASS = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $PASS -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($SSH_USER, $SecPass)

$localDist = "f:\Antigravity\client\dist"
$localZip = "f:\Antigravity\client_deploy_refined.zip"
$remoteZip = "/tmp/client_deploy_refined.zip"
$remoteDest = "/var/www/purple-port/client/dist"

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

Write-Host "Verifying new code presence..."
$check = Invoke-SSHCommand -SSHSession $session -Command "grep -r 'Manual Backup to PC' $remoteDest/assets/"
if ($check.Output) {
    Write-Host "SUCCESS: New code detected on VPS." -ForegroundColor Green
} else {
    Write-Host "ERROR: New code NOT detected on VPS after extraction." -ForegroundColor Red
}

Write-Host "Reloading Nginx..."
Invoke-SSHCommand -SSHSession $session -Command "nginx -s reload"

Write-Host "Frontend Deployment Complete!"
Remove-SSHSession $session
Remove-Item $localZip
