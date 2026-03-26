# Check Nginx compression
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

Write-Host "`n[1] Check Nginx Gzip configuration" -ForegroundColor Yellow
Run "grep -r 'gzip' /etc/nginx/nginx.conf"

Write-Host "`n[2] Check if Gzip is enabled in the default site" -ForegroundColor Yellow
Run "grep 'gzip' /etc/nginx/sites-available/default"

Remove-SSHSession -SessionId $s.SessionId | Out-Null
