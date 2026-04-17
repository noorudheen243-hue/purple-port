Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd, $timeout = 15) {
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

Write-Host "=== Nginx config for qixport.com ===" -ForegroundColor Cyan
Run "cat /etc/nginx/sites-enabled/default 2>/dev/null || cat /etc/nginx/sites-available/default 2>/dev/null | head -60"

Write-Host "`n=== Test if /api/marketing/auth/meta path is reachable ===" -ForegroundColor Cyan
Run "curl -s -o /dev/null -w '%{http_code}' http://localhost:4001/api/marketing/auth/meta"

Write-Host "`n=== Current .env key values ===" -ForegroundColor Cyan
Run "grep -E 'API_URL|CLIENT_URL|META_APP_ID' /var/www/purple-port/server/.env"

Remove-SSHSession -SessionId $s.SessionId | Out-Null
