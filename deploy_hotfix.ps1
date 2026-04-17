Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$sftp = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Deploy compiled JavaScript
Write-Host "Uploading JS Service..."
Set-SFTPItem -SFTPSession $sftp -Path 'f:\Antigravity\server\dist\modules\payroll\service.js' -Destination '/var/www/antigravity/server/dist/modules/payroll/' -Force

# Also deploy TS for source parity
Write-Host "Uploading TS Source..."
Set-SFTPItem -SFTPSession $sftp -Path 'f:\Antigravity\server\src\modules\payroll\service.ts' -Destination '/var/www/antigravity/server/src/modules/payroll/' -Force

Write-Host "Restarting PM2..."
$r = Invoke-SSHCommand -SessionId $s.SessionId -Command 'source $HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart all'
Write-Host $r.Output

Remove-SFTPSession -SFTPSession $sftp | Out-Null
Remove-SSHSession -SessionId $s.SessionId | Out-Null
Write-Host "Hotfix deployed successfully!"
