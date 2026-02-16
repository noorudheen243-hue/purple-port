
# Diagnostic Script for VPS
$ServerIP = "66.116.224.221"
$User = "root"

Write-Host "Running Diagnostics on $ServerIP..." -ForegroundColor Cyan

$RemoteScript = @"
echo "--- 1. HOSTNAME & IP ---"
hostname -I

echo "--- 2. NGINX STATUS ---"
systemctl status nginx | grep Active
nginx -t

echo "--- 3. NGINX ERROR LOGS ---"
tail -n 20 /var/log/nginx/error.log

echo "--- 4. PM2 STATUS & LOGS ---"
pm2 list
pm2 logs antigravity-app --lines 50 --nostream

echo "--- 5. LISTENING PORTS ---"
netstat -tlpn | grep LISTEN

echo "--- 6. FIREWALL STATUS ---"
ufw status

echo "--- 7. APP HEALTH CHECK ---"
curl -I http://localhost:4001 || echo "Backend Down"
curl -I http://localhost:80 || echo "Frontend Down"

echo "--- 8. FILE STRUCTURE VERIFICATION ---"
echo "Checking Database:"
ls -l /var/www/purple-port/prisma/dev.db

echo "Checking Uploads:"
ls -ld /var/www/purple-port/uploads

echo "Checking .env Configuration:"
ls -l /var/www/purple-port/.env || echo "❌ .ENV FILE MISSING!"
"@

$RemoteScript = $RemoteScript -replace "`r", ""
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -t "$User@$ServerIP" "bash -c '$RemoteScript'"
