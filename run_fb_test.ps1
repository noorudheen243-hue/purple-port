Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Connecting SSH and SFTP..." -ForegroundColor Cyan
$sftp = New-SFTPSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
$ssh = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

try {
    Write-Host "Uploading test script..." -ForegroundColor Yellow
    Set-SFTPItem -SFTPSession $sftp -Path "f:\Antigravity\server\scratch\check_ad_page.js" -Destination "/var/www/purple-port/server/" -Force

    Write-Host "Running test script on VPS..." -ForegroundColor Yellow
    $cmd = "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && node check_ad_page.js"
    $r = Invoke-SSHCommand -SessionId $ssh.SessionId -Command $cmd
    Write-Host $r.Output
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Red }
}
finally {
    if ($sftp) { Remove-SFTPSession -SFTPSession $sftp | Out-Null }
    if ($ssh) { Remove-SSHSession -SessionId $ssh.SessionId | Out-Null }
}
