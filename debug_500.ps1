
# Debug 500 Error
$ServerIP = "66.116.224.221"
$User = "root"

Write-Host "Fetching Logs from $ServerIP..." -ForegroundColor Cyan

$RemoteScript = @"
echo "--- 1. CURRENT .ENV ---"
cat /var/www/purple-port/.env

echo "--- 2. FILE CHECK ---"
ls -l /var/www/purple-port/prisma/dev.db
ls -l /var/www/purple-port/dist/server.js

echo "--- 3. PM2 ERROR LOGS ---"
pm2 logs antigravity-app --lines 100 --nostream
"@

# Sanitize
$RemoteScript = $RemoteScript -replace "`r", ""

ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -t "$User@$ServerIP" "bash -c '$RemoteScript'"
