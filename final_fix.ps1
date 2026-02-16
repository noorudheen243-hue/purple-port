
# Final Fix Script - Minimal Syntax
$ServerIP = "66.116.224.221"
$User = "root"

Write-Host "Applying Final Fix to $ServerIP..." -ForegroundColor Cyan

$RemoteScript = @"
echo "1. Updating .env..."
sed -i 's|file:./dev.db|file:/var/www/purple-port/prisma/dev.db|g' /var/www/purple-port/.env

echo "2. Content Check:"
cat /var/www/purple-port/.env

echo "3. Restarting App..."
cd /var/www/purple-port
pm2 delete all
NODE_ENV=production pm2 start dist/server.js --name "antigravity-app" --update-env
pm2 save

echo "4. Checking Health..."
sleep 5
curl -I http://localhost:4001
"@

# Sanitize
$RemoteScript = $RemoteScript -replace "`r", ""

ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -t "$User@$ServerIP" "bash -c '$RemoteScript'"
