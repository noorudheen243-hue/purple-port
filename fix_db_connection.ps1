
# Script to Fix Database Connection Path (Simplified)
$ServerIP = "66.116.224.221"
$User = "root"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   FIXING DB CONNECTION ON $ServerIP      " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$RemoteScript = @"
set -e

echo "Step 1 of 3: Updating .env DATABASE_URL..."
# Replace relative path with absolute path
sed -i 's|DATABASE_URL="file:./dev.db"|DATABASE_URL="file:/var/www/purple-port/prisma/dev.db"|g' /var/www/purple-port/.env

echo "Step 2 of 3: Verifying Change..."
cat /var/www/purple-port/.env

echo "Step 3 of 3: Restarting Backend..."
cd /var/www/purple-port
pm2 delete all || true
NODE_ENV=production pm2 start dist/server.js --name "antigravity-app" --update-env
pm2 save

echo "Waiting for service to start..."
sleep 5

echo "Checking Service Health..."
if curl -I http://localhost:4001; then
    echo "✅ BACKEND IS UP AND RUNNING!"
else
    echo "❌ BACKEND FAILED TO START."
    echo "Last 50 lines of logs:"
    pm2 logs antigravity-app --lines 50 --nostream
fi
"@

# Sanitize for Linux
$RemoteScript = $RemoteScript -replace "`r", ""

ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -t "$User@$ServerIP" "bash -c '$RemoteScript'"
