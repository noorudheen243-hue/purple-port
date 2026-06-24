Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"
$User = "root"
$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)

Write-Host "Connecting SSH to $VPS..." -ForegroundColor Cyan
$s = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

function Run($cmd, $timeout = 600) {
    Write-Host "`n>> $cmd" -ForegroundColor DarkGray
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command $cmd -TimeOut $timeout
    if ($r.Output) { Write-Host $r.Output -ForegroundColor White }
    if ($r.Error -and $r.Error.Trim()) { Write-Host "ERR: $($r.Error)" -ForegroundColor Yellow }
    return $r
}

try {
    Write-Host "`n[1/5] Pulling Latest Code from Git on VPS..." -ForegroundColor Yellow
    Run "cd /var/www/purple-port && git fetch origin && git reset --hard origin/main"

    Write-Host "`n[2/5] Updating DATABASE_URL in .env..." -ForegroundColor Yellow
    # Read current .env
    $r = Invoke-SSHCommand -SessionId $s.SessionId -Command "cat /var/www/purple-port/server/.env"
    $envContent = $r.Output -join "`n"
    Write-Host "Current .env:"
    Write-Host $envContent -ForegroundColor Gray

    # Update the database URL using sed to be absolute
    $sedCmd = 'sed -i ''s|DATABASE_URL=.*|DATABASE_URL="file:/var/www/purple-port/server/prisma/dev.db"|'' /var/www/purple-port/server/.env'
    Run $sedCmd
    
    # Verify .env update
    $r2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cat /var/www/purple-port/server/.env"
    Write-Host "`nUpdated .env:"
    Write-Host ($r2.Output -join "`n") -ForegroundColor Green

    Write-Host "`n[3/5] Generating Prisma client on VPS..." -ForegroundColor Yellow
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && npx prisma generate"

    Write-Host "`n[4/5] Building server..." -ForegroundColor Yellow
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; cd /var/www/purple-port/server && npm run build"

    Write-Host "`n[5/5] Restarting PM2 with updated environment variables..." -ForegroundColor Yellow
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart qix-api --update-env"
    Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 status"

    Write-Host "`n[6] Testing login endpoint via curl..." -ForegroundColor Yellow
    # Test a login to verify the database connection works now
    Run "sleep 3 && curl -s -X POST http://localhost:4001/api/auth/login -H 'Content-Type: application/json' -d '{""email"":""qixads@qix.com"",""password"":""password123""}' | cut -c 1-150"
    
}
catch {
    Write-Error "Failed to fix DB setup: $($_.Exception.Message)"
}
finally {
    if ($s) {
        Remove-SSHSession -SessionId $s.SessionId | Out-Null
    }
}
