# Inspect Nginx API Proxy and Frontend Build
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

Write-Host "`n[1] Read full Nginx default config" -ForegroundColor Yellow
Run "cat /etc/nginx/sites-available/default"

Write-Host "`n[2] Check for dist folders in both locations" -ForegroundColor Yellow
Run "ls -ld /var/www/purple-port/server/public /var/www/antigravity/client/dist 2>/dev/null"

Write-Host "`n[3] Check if there are any error logs in Nginx" -ForegroundColor Yellow
Run "tail -n 20 /var/log/nginx/error.log"

Remove-SSHSession -SessionId $s.SessionId | Out-Null
