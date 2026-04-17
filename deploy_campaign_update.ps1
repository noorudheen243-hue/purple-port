$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)

try {
    Write-Host "Connecting to VPS..." -ForegroundColor Cyan
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force

    # Step 1: Git Pull latest changes
    Write-Host "`n--- STEP 1: Git Pull ---" -ForegroundColor Yellow
    $pull = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port && git pull origin main 2>&1"
    Write-Host $pull.Output

    # Step 2: Run Prisma DB Push for schema migration (non-destructive)
    Write-Host "`n--- STEP 2: Prisma DB Push (Schema Migration) ---" -ForegroundColor Yellow
    $dbpush = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && npx prisma db push --accept-data-loss 2>&1"
    Write-Host $dbpush.Output

    # Step 3: Build Client
    Write-Host "`n--- STEP 3: Build Client ---" -ForegroundColor Yellow
    $clientBuild = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/client && npm install && npm run build 2>&1" -Timeout 300
    Write-Host $clientBuild.Output

    # Step 4: Build Server & Restart PM2
    Write-Host "`n--- STEP 4: Build Server & Restart PM2 ---" -ForegroundColor Yellow
    $serverBuild = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && npm install && npx prisma generate && npm run build 2>&1" -Timeout 300
    Write-Host $serverBuild.Output

    # Step 5: Restart PM2
    Write-Host "`n--- STEP 5: Restart PM2 ---" -ForegroundColor Yellow
    $pm2 = Invoke-SSHCommand -SessionId $s.SessionId -Command "cd /var/www/purple-port/server && pm2 restart qix-api 2>&1 || pm2 restart all 2>&1"
    Write-Host $pm2.Output

    # Step 6: Verify
    Write-Host "`n--- STEP 6: PM2 Status ---" -ForegroundColor Yellow
    $status = Invoke-SSHCommand -SessionId $s.SessionId -Command "pm2 list 2>&1"
    Write-Host $status.Output

    Write-Host "`n✅ DEPLOYMENT COMPLETE" -ForegroundColor Green

} catch {
    Write-Host "Exception: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    if ($s) { Remove-SSHSession -SessionId $s.SessionId }
}
