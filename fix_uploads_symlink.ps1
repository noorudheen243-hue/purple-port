# Fix Profile Images Visibility via Symlink
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd, $timeout = 60) {
    Write-Host "`n>> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

Write-Host "`n[1] Check existing empty uploads dir" -ForegroundColor Yellow
Run "ls -lah /var/www/antigravity/uploads"

Write-Host "`n[2] Backup/Delete the empty uploads directory" -ForegroundColor Yellow
Run "mv /var/www/antigravity/uploads /var/www/antigravity/uploads_empty_backup"

Write-Host "`n[3] Create the symlink to the real uploads directory" -ForegroundColor Yellow
Run "ln -s /var/www/purple-port/server/uploads /var/www/antigravity/uploads"
Run "ls -lah /var/www/antigravity/uploads"

Write-Host "`n[4] Verify images are accessible" -ForegroundColor Yellow
Run "ls -lah /var/www/antigravity/uploads/avatars | head -5"
Run "curl -I -s http://localhost:4001/api/uploads/avatars/$(ls /var/www/purple-port/server/uploads/avatars 2>/dev/null | head -1) | head -2"

Remove-SSHSession -SessionId $s.SessionId | Out-Null
