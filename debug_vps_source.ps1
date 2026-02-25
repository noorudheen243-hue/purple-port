# Check VPS source and dist
Import-Module Posh-SSH -Force

$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run ($cmd) {
    Write-Host ">> $cmd" -ForegroundColor Gray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut 60
    Write-Host $r.Output
}

Write-Host "Checking /var/www/purple-port/server/src/modules/backup/routes.ts ..."
Run 'grep "authorize" /var/www/purple-port/server/src/modules/backup/routes.ts'

Write-Host "`nChecking /var/www/purple-port/server/package.json build script ..."
Run 'grep "build" /var/www/purple-port/server/package.json'

Write-Host "`nChecking git status ..."
Run 'cd /var/www/purple-port && git status && git log -1 --oneline'

Remove-SSHSession -SessionId $s.SessionId | Out-Null
