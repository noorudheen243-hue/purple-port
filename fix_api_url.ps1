Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd, $timeout = 30) {
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

Write-Host "[1] Fixing API_URL in .env to use production domain..." -ForegroundColor Cyan
Run "sed -i 's|API_URL=.*|API_URL=\"https://qixport.com\"|g' /var/www/purple-port/server/.env && grep 'API_URL' /var/www/purple-port/server/.env"

Write-Host "`n[2] Restarting PM2 with updated env..." -ForegroundColor Cyan
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart all --update-env && pm2 save"

Write-Host "`n[3] Verifying the callback URL the app will use now:" -ForegroundColor Cyan
Run "grep 'API_URL' /var/www/purple-port/server/.env"

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Write-Host "`nDone! Callback URL is now: https://qixport.com/api/marketing/auth/meta/callback" -ForegroundColor Green
