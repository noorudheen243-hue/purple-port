Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Read base64
$r = Invoke-SSHCommand -SSHSession $session -Command "base64 /var/www/pm2.txt"

# Write out base64 string directly
$b64 = $r.Output -join ""
try {
    $bytes = [System.Convert]::FromBase64String($b64)
    [System.IO.File]::WriteAllBytes("f:\Antigravity\vps_pm2.txt", $bytes)
    Write-Host "Logs downloaded successfully!"
}
catch {
    Write-Host "Failed to decode base64 string: $_"
}

Remove-SSHSession -SSHSession $session | Out-Null
