# Create clean .env in /var/www/antigravity and restart
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

Write-Host "`n[1] Create .env file for antigravity app" -ForegroundColor Yellow
$envContent = @"
PORT=4001
DATABASE_URL="file:/var/www/purple-port/server/prisma/dev.db"
JWT_SECRET="super-secret-key-change-this"
CLIENT_URL="https://qixport.com"
BIOMETRIC_API_KEY="ag_bio_sync_v1_secret_key"
NODE_ENV="production"
"@

Run "echo '$envContent' > /var/www/antigravity/.env && echo '.env created successfully'"
Run "cat /var/www/antigravity/.env"

Write-Host "`n[2] Restart PM2 qix-backend with updated environment" -ForegroundColor Yellow
Run "source `$HOME/.nvm/nvm.sh 2>/dev/null; pm2 restart qix-backend --update-env && pm2 save"

Write-Host "`n[3] Health check" -ForegroundColor Yellow
Run "sleep 4 && curl -s http://localhost:4001/health"

Write-Host "`n[4] Test client login NOW" -ForegroundColor Yellow
Run "curl -s -X POST http://localhost:4001/api/auth/login -H 'Content-Type: application/json' -d '{""email"":""qixads@qix.com"",""password"":""password123""}' | head -100"

Write-Host "`n[5] Test another client" -ForegroundColor Yellow
Run "curl -s -X POST http://localhost:4001/api/auth/login -H 'Content-Type: application/json' -d '{""email"":""valuableservices@qix.com"",""password"":""password123""}' | head -100"

Remove-SSHSession -SessionId $s.SessionId | Out-Null
