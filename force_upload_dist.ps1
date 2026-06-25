Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Compressing..."
if (Test-Path "f:\Antigravity\client_dist.zip") { Remove-Item "f:\Antigravity\client_dist.zip" -Force }
Compress-Archive -Path "f:\Antigravity\client\dist\*" -DestinationPath "f:\Antigravity\client_dist.zip" -Force

Write-Host "Connecting..."
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$sftp = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "Uploading..."
Set-SFTPItem -SFTPSession $sftp -Path "f:\Antigravity\client_dist.zip" -Destination "/tmp" -Force

Write-Host "Extracting on server..."
$session = $s[-1]
$r = Invoke-SSHCommand -SessionId $session.SessionId -Command "rm -rf /var/www/purple-port/client/dist/* && unzip -o /tmp/client_dist.zip -d /var/www/purple-port/client/dist/ && rm /tmp/client_dist.zip && systemctl restart nginx"
if ($r.Output) { Write-Host $r.Output }
if ($r.Error) { Write-Host "ERR: $($r.Error)" }

Remove-SFTPSession -SFTPSession $sftp | Out-Null
Remove-SSHSession -SessionId $session.SessionId | Out-Null
Write-Host "Done!"
