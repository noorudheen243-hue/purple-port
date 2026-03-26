# Verify image accessibility
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

Write-Host "`n[1] Check a real image file name" -ForegroundColor Yellow
Run "ls -1 /var/www/antigravity/uploads | grep -i '\.png\|\.jpg\|\.jpeg' | head -1"

Write-Host "`n[2] Test curl against that file" -ForegroundColor Yellow
$testHtml = `"
FILENAME=`$(ls -1 /var/www/antigravity/uploads | grep -i '\.png\|\.jpg\|\.jpeg' | head -1)
if [ -n `"`$FILENAME`" ]; then
echo `"Testing /api/uploads/`$FILENAME`"
curl -I -s `"http://localhost:4001/api/uploads/`$FILENAME`" | head -5
else
echo `"No images found`"
fi
`"
$cmd = $testHtml -replace "`r", ""
Run $cmd

Remove-SSHSession -SessionId $s.SessionId | Out-Null
