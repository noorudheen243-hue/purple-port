# Compare builds and check Nginx blocks
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

Write-Host "`n[1] Check index.html timestamps" -ForegroundColor Yellow
Run "ls -lc /var/www/purple-port/server/public/index.html /var/www/antigravity/client/dist/index.html 2>/dev/null"

Write-Host "`n[2] Read Nginx location blocks" -ForegroundColor Yellow
Run "grep -A 50 'location /' /etc/nginx/sites-available/default"

Write-Host "`n[3] Check if there's an upstream defined elsewhere" -ForegroundColor Yellow
Run "grep -r 'upstream' /etc/nginx/ 2>/dev/null"

Remove-SSHSession -SessionId $s.SessionId | Out-Null
