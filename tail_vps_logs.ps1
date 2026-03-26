Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "Reading Error Logs..."
$r_err = Invoke-SSHCommand -SSHSession $session -Command "tail -n 100 /root/.pm2/logs/qix-ads-v2.6-error.log"
Write-Host "--- ERROR LOG ---"
Write-Host $r_err.Output

Write-Host "`nReading Out Logs (for context)..."
$r_out = Invoke-SSHCommand -SSHSession $session -Command "tail -n 50 /root/.pm2/logs/qix-ads-v2.6-out.log"
Write-Host "--- OUT LOG ---"
Write-Host $r_out.Output

Remove-SSHSession -SSHSession $session | Out-Null
