# Check directories on VPS
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

Write-Host "`n[1] Check /var/www/antigravity and its subfolders" -ForegroundColor Yellow
Run "ls -F /var/www/antigravity"
Run "ls -F /var/www/antigravity/client"

Write-Host "`n[2] Check /var/www/purple-port" -ForegroundColor Yellow
Run "ls -F /var/www/purple-port/server/public"

Remove-SSHSession -SessionId $s.SessionId | Out-Null
