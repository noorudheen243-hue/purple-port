# Clean build and restart
Import-Module Posh-SSH -Force

$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run ($cmd) {
    Write-Host ">> $cmd" -ForegroundColor Gray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut 180
    Write-Host $r.Output
}

Write-Host "Checking PM2 process info..."
Run 'pm2 show qix-backend | grep "interpreter args" -A 5'

Write-Host "`nCleaning and rebuilding /var/www/purple-port/server ..."
Run 'source $HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && rm -rf dist && npm run build'

Write-Host "`nVerifying dist again ..."
Run 'grep "save-to-disk" /var/www/purple-port/server/dist/modules/backup/routes.js'

Write-Host "`nRestarting PM2 ..."
Run 'source $HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart qix-backend'

Remove-SSHSession -SessionId $s.SessionId | Out-Null
