$Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential("root", $SecPass)
try {
    $s = New-SSHSession -ComputerName "66.116.224.221" -Credential $Cred -AcceptKey -Force
    Write-Host ">>> Checking Git Log..."
    $r1 = Invoke-SSHCommand -SSHSession $s -Command "cd /var/www/purple-port && git log -n 1 --oneline"
    Write-Host "Last Commit: $($r1.Output)"

    Write-Host ">>> Running Deploy Script Segmented..."
    
    Write-Host "1. Pulling Changes..."
    $r2 = Invoke-SSHCommand -SSHSession $s -Command "cd /var/www/purple-port && git fetch --all && git reset --hard origin/main"
    Write-Host $r2.Output

    Write-Host "2. Building Server..."
    $r3 = Invoke-SSHCommand -SSHSession $s -Command "cd /var/www/purple-port/server && npm install --legacy-peer-deps && npx prisma generate && npm run build"
    Write-Host $r3.Output

    Write-Host "3. Applying DB Changes..."
    $r4 = Invoke-SSHCommand -SSHSession $s -Command "cd /var/www/purple-port/server && npx prisma db push --accept-data-loss"
    Write-Host $r4.Output

    Write-Host "4. Building Client..."
    $r5 = Invoke-SSHCommand -SSHSession $s -Command "cd /var/www/purple-port/client && npm install --legacy-peer-deps && npm run build"
    Write-Host $r5.Output

    Write-Host "5. Restarting PM2..."
    $r6 = Invoke-SSHCommand -SSHSession $s -Command "cd /var/www/purple-port/server && pm2 restart qix-api || pm2 start dist/server.js --name qix-api"
    Write-Host $r6.Output

    Write-Host "6. Running Unified Migration..."
    $r7 = Invoke-SSHCommand -SSHSession $s -Command "cd /var/www/purple-port/server && node dist/scripts/migrate_to_unified.js"
    Write-Host $r7.Output

} catch {
    Write-Error $_.Exception.Message
} finally {
    if ($s) { Remove-SSHSession -SSHSession $s }
}
