# Simpler Verify Image Script
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

Write-Host "`n[1] Check one real image file name and test it via HTTP" -ForegroundColor Yellow
Run "F=`$(ls -1 /var/www/antigravity/uploads | grep '\.png' | head -1) && echo `"Testing: `$F`" && curl -I -s `"http://localhost:4001/api/uploads/`$F`" | head -2"

Remove-SSHSession -SessionId $s.SessionId | Out-Null
