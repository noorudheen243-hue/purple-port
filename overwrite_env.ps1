
# Script to Overwrite .env and Fix Database Connection
$ServerIP = "66.116.224.221"
$User = "root"

Write-Host "Overwriting .env configuration on $ServerIP..." -ForegroundColor Cyan

$RemoteScript = @"
echo "Step 1 of 4: Clearing old .env..."
rm -f /var/www/purple-port/.env

echo "Step 2 of 4: Writing new configuration..."
echo 'PORT=4001' >> /var/www/purple-port/.env
echo 'DATABASE_URL="file:/var/www/purple-port/prisma/dev.db"' >> /var/www/purple-port/.env
echo 'JWT_SECRET="super-secret-key-change-this"' >> /var/www/purple-port/.env
echo 'CLIENT_URL="http://66.116.224.221"' >> /var/www/purple-port/.env
echo 'BIOMETRIC_API_KEY="ag_bio_sync_v1_secret_key"' >> /var/www/purple-port/.env

echo "Step 3 of 4: Verifying content..."
cat /var/www/purple-port/.env

echo "Step 4 of 4: Restarting application..."
cd /var/www/purple-port
pm2 delete all || true
NODE_ENV=production pm2 start dist/server.js --name "antigravity-app" --update-env
pm2 save

echo "Waiting for start..."
sleep 5
curl -I http://localhost:4001
"@

# Sanitize for Linux (Resulting in clean LFs)
$RemoteScript = $RemoteScript -replace "`r", ""

ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -t "$User@$ServerIP" "bash -c '$RemoteScript'"
