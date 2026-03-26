# Fix Client Login - Step 2: Find correct app path and deploy
Import-Module Posh-SSH -Force

$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Connecting to VPS..." -ForegroundColor Cyan
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
Write-Host "Connected!" -ForegroundColor Green

function Run($cmd, $timeout = 120) {
    Write-Host ">> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

Write-Host "`n[1] Find PM2 app details" -ForegroundColor Yellow
Run 'source $HOME/.nvm/nvm.sh 2>/dev/null; pm2 list; pm2 show qix-backend 2>/dev/null | head -30 || pm2 show 0 2>/dev/null | head -30'

Write-Host "`n[2] Find where the real app is" -ForegroundColor Yellow
Run 'find /var/www -name "server.js" 2>/dev/null | head -5; find /root -name "server.js" 2>/dev/null | head -3; ls /var/www/'

Write-Host "`n[3] Check ecosystem config or PM2 startup location" -ForegroundColor Yellow
Run 'cat /root/.pm2/dump.pm2 2>/dev/null | python3 -c "import sys,json;d=json.load(sys.stdin);[print(a[\"name\"]+\":\"+a[\"pm_cwd\"]+\"/\"+a[\"pm_exec_path\"]) for a in d[\"list\"]]" 2>/dev/null || pm2 show 0 2>/dev/null'

Remove-SSHSession -SessionId $s.SessionId | Out-Null
