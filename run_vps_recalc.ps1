Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd) {
    Write-Host "`n>> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut 600
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

try {
    Write-Host "Updating code on VPS..." -ForegroundColor Yellow
    Run "cd /var/www/purple-port && git fetch origin && git reset --hard origin/main"
    
    Write-Host "Building server on VPS..." -ForegroundColor Yellow
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && npm run build"

    Write-Host "Running retroactive recalculation script..." -ForegroundColor Yellow
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && node dist/scripts/recalculate_all.js"

    Write-Host "Verifying results via query script..." -ForegroundColor Yellow
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && node dist/scripts/query_attendance.js"

    Write-Host "Verifying leave and LOP records via check_leaves_db script..." -ForegroundColor Yellow
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && node dist/scripts/check_leaves_db.js"
}
finally {
    if ($s) {
        Remove-SSHSession -SessionId $s.SessionId | Out-Null
    }
}
