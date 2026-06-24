Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$sftp = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

try {
    Set-SFTPItem -SFTPSession $sftp -Path "f:\Antigravity\server\scratch\vps_db_query.js" -Destination "/var/www/purple-port/server/" -Force
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && node vps_db_query.js" -TimeOut 60
    if ($r.Output) { Write-Host ($r.Output -join "`n") }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Red }
    Invoke-SSHCommand -SessionId $s.SessionId -Command "rm /var/www/purple-port/server/vps_db_query.js" | Out-Null
}
finally {
    if ($sftp) { Remove-SFTPSession -SFTPSession $sftp | Out-Null }
    if ($s) { Remove-SSHSession -SessionId $s.SessionId | Out-Null }
}
