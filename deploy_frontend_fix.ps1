# Deployment script for frontend fix
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$LocalDist = "f:\Antigravity\client\dist"
$ZipFile = "f:\Antigravity\frontend_fix.zip"
$RemotePath = "/var/www/purple-port/client/dist"

Write-Host "Zipping frontend assets..." -ForegroundColor Yellow
if (Test-Path $ZipFile) { Remove-Item $ZipFile }
Compress-Archive -Path "$LocalDist\*" -DestinationPath $ZipFile

$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Uploading to VPS..." -ForegroundColor Yellow
$sftp = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
Set-SFTPItem -SessionId $sftp.SessionId -Path $ZipFile -Destination "/tmp/frontend_fix.zip" -Force
Remove-SFTPSession -SessionId $sftp.SessionId

Write-Host "Extracting on VPS..." -ForegroundColor Yellow
$ssh = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$cmd = @"
mkdir -p $RemotePath
unzip -o -q /tmp/frontend_fix.zip -d $RemotePath
chown -R www-data:www-data $RemotePath
systemctl reload nginx
echo "DEPLOY_SUCCESS"
"@
$r = Invoke-SSHCommand -SessionId $ssh.SessionId -Command $cmd
Write-Host $r.Output
Remove-SSHSession -SessionId $ssh.SessionId

Write-Host "Done!" -ForegroundColor Green
