Import-Module Posh-SSH -Force
$c = New-Object System.Management.Automation.PSCredential('root', (ConvertTo-SecureString 'EzdanAdam@243' -AsPlainText -Force))
$s = New-SSHSession -ComputerName 66.116.224.221 -Credential $c -AcceptKey -Force
$r = Invoke-SSHCommand -SSHSession $s -Command 'pm2 list'
Write-Host ($r.Output -join "`n")
Remove-SSHSession -SSHSession $s | Out-Null
