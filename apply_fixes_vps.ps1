Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# 1. Update Nginx Config
Write-Host "Updating Nginx Config..."
Set-SCPItem -ComputerName $VPS -Credential $Cred -Path "f:\Antigravity\nginx_config_new.txt" -Destination "/root/nginx_default_new" -Force
Invoke-SSHCommand -SSHSession $session -Command "mv /root/nginx_default_new /etc/nginx/sites-available/default && ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default"
Invoke-SSHCommand -SSHSession $session -Command "nginx -t && systemctl reload nginx"

# 2. Sync Schema to the ACTUAL database file
Write-Host "Syncing schema to the live database file..."
# We use npx prisma db push from the server directory. 
# It will use the DATABASE_URL from .env (which we know points to purple-port/...)
Invoke-SSHCommand -SSHSession $session -Command "cd /var/www/antigravity/server && npx prisma db push --accept-data-loss"

# 3. Regenerate Prisma Client
Write-Host "Regenerating Prisma Client..."
Invoke-SSHCommand -SSHSession $session -Command "cd /var/www/antigravity/server && npx prisma generate"

# 4. Restart Server
Write-Host "Restarting Server..."
Invoke-SSHCommand -SSHSession $session -Command "pm2 restart qix-ads-v2.6"

# 5. Verify database tables (Optional Debug)
Write-Host "Verifying tables in live DB..."
$dbPath = "/var/www/purple-port/server/prisma/dev.db"
$r = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 $dbPath .tables"
Write-Host "Tables: $($r.Output)"

Remove-SSHSession -SSHSession $session | Out-Null
Write-Host "--- FIXES APPLIED ---"
