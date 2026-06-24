Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$sftp = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

try {
    # Upload test_lop_details.js
    Set-SFTPItem -SFTPSession $sftp -Path "f:\Antigravity\server\test_lop_details.js" -Destination "/var/www/purple-port/server/" -Force
    
    # Run it
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && node test_lop_details.js" -TimeOut 60
    if ($r.Output) { Write-Host ($r.Output -join "`n") }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Red }
    
    # Clean up
    Invoke-SSHCommand -SessionId $s.SessionId -Command "rm /var/www/purple-port/server/test_lop_details.js" | Out-Null
}
finally {
    if ($sftp) { Remove-SFTPSession -SFTPSession $sftp | Out-Null }
    if ($s) { Remove-SSHSession -SessionId $s.SessionId | Out-Null }
}
