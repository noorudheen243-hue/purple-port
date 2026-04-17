Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"  
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$sftp = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Download the actual LIVE purple-port database
Write-Host "Downloading LIVE purple-port database..." -ForegroundColor Cyan
Get-SFTPItem -SFTPSession $sftp -Path /var/www/purple-port/server/prisma/dev.db -Destination f:\Antigravity\server\ -Force

Write-Host "Download complete!" -ForegroundColor Green
Remove-SSHSession -SessionId $s.SessionId | Out-Null
Remove-SFTPSession -SFTPSession $sftp | Out-Null
