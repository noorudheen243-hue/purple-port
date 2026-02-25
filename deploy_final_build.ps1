# Final build + restart on VPS after second git pull
Import-Module Posh-SSH -Force

$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run ($cmd) {
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut 180
    if ($r.Output) { Write-Host $r.Output }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
}

Write-Host "Building server with latest code..." -ForegroundColor Yellow
Run 'source $HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port && npm run build 2>&1 | tail -3'
Write-Host "Restarting PM2..." -ForegroundColor Yellow
Run 'source $HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart all && echo "PM2 OK"'
Write-Host "Verifying DEVELOPER_ADMIN only restriction..." -ForegroundColor Yellow
Run 'grep "save-to-disk" /var/www/purple-port/dist/modules/backup/routes.js'

Remove-SSHSession -SessionId $s.SessionId | Out-Null
Write-Host "DONE. Test at: https://www.qixport.com/dashboard/settings" -ForegroundColor Green
