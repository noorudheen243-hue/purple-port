# Second pull - apply DEVELOPER_ADMIN restriction commit
Import-Module Posh-SSH -Force

$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Connecting to VPS..." -ForegroundColor Cyan
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force
Write-Host "Connected" -ForegroundColor Green

function Run ($cmd) {
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut 180
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
}

Run 'cd /var/www/purple-port && git pull origin main && git log -1 --oneline'
Run 'source $HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port && npm run build 2>&1 | tail -3'
Run 'source $HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart all && echo "PM2 OK"'
Run 'grep -r "DEVELOPER_ADMIN" /var/www/purple-port/dist/modules/backup/routes.js && echo "RESTRICTION_CONFIRMED"'

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Write-Host "Done! Test: https://www.qixport.com/dashboard/settings" -ForegroundColor Green
