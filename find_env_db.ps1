Import-Module Posh-SSH -Force
$VPS = "66.116.224.221"; $User = "root"; $Pass = "EzdanAdam@243"
$SecPass = ConvertTo-SecureString $Pass -AsPlainText -Force
$Cred = New-Object System.Management.Automation.PSCredential($User, $SecPass)
$session = New-SSHSession -ComputerName $VPS -Credential $Cred -AcceptKey -Force

# Find the running process, get its env DATABASE_URL
$r = Invoke-SSHCommand -SSHSession $session -Command "pm2 show qix-ads-v2.6 | grep -i database"
Write-Host "DATABASE from PM2:" $r.Output

# Get env from the .env file
$r2 = Invoke-SSHCommand -SSHSession $session -Command "cat /var/www/antigravity/server/.env | grep DATABASE"
Write-Host "DATABASE_URL from .env:" $r2.Output

# Check all db files with actual row counts
$dbs = @(
    "/var/www/antigravity/prisma/dev.db",
    "/var/www/antigravity/server/dist/prisma/dev.db",
    "/var/www/antigravity/server/prisma/dev.db",
    "/var/www/purple-port/server/prisma/dev.db"
)
foreach ($db in $dbs) {
    $cnt = Invoke-SSHCommand -SSHSession $session -Command "sqlite3 $db 'SELECT platform, externalAccountId FROM MarketingAccount LIMIT 10;' 2>/dev/null"
    if ($cnt.Output) {
        Write-Host "=== DB: $db ==="
        Write-Host $cnt.Output
    }
}

Remove-SSHSession -SSHSession $session | Out-Null
