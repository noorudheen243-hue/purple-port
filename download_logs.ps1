Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# We already generated pm2.txt on the server. Just download it.
Get-SFTPFile -SSHSession $session -RemoteFile "/var/www/pm2.txt" -LocalPath "f:\Antigravity\vps_pm2.txt" -Overwrite

Remove-SSHSession -SSHSession $session | Out-Null
