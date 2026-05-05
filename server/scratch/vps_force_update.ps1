
Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

Write-Host "Force-resetting VPS to match GitHub..."
$r1 = Invoke-SSHCommand -SSHSession $session -Command "cd /var/www/purple-port && git fetch origin && git reset --hard origin/main"
Write-Host $r1.Output

Write-Host "CLEANING DATA: Removing old messy syncs (preserving native unified data)..."
# Wipe only synced legacy transactions to allow a clean re-sync with the new single-entry logic
$wipeCmd = "cd /var/www/purple-port/server && npx prisma db execute --stdin <<'SQL'`nDELETE FROM UnifiedTransaction WHERE reference LIKE 'LE:%';`nSQL"
$rWipe = Invoke-SSHCommand -SSHSession $session -Command $wipeCmd
Write-Host "Old sync data cleared."

Write-Host "Rebuilding Server..."
$r2 = Invoke-SSHCommand -SSHSession $session -Command "cd /var/www/purple-port/server && npm run build"
Write-Host $r2.Output

Write-Host "Restarting API..."
$r3 = Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-api"
Write-Host $r3.Output

Write-Host "Rebuilding Client..."
$r4 = Invoke-SSHCommand -SSHSession $session -Command "cd /var/www/purple-port/client && npm run build"
Write-Host $r4.Output

Write-Host "Updating static files..."
$r5 = Invoke-SSHCommand -SSHSession $session -Command "cp -r /var/www/purple-port/client/dist/* /var/www/purple-port/server/public/"
Write-Host "VPS Fully Updated and Cleaned."

Remove-SSHSession -SSHSession $session | Out-Null
