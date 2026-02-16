
# Script to Repair VPS Environment (Install PM2, Unzip & Re-Deploy)
$ServerIP = "66.116.224.221"
$User = "root"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   REPAIRING VPS ENVIRONMENT ON $ServerIP " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$RemoteScript = @"
set -e

echo "Step 1 of 5: Updating System..."
apt-get update

echo "Step 2 of 5: Installing Unzip and Node Tools..."
apt-get install -y unzip curl

# Install Node 20 if logic fails? Assuming node is there mostly.
if ! command -v node &> /dev/null; then
    echo "   Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

echo "Step 3 of 5: Installing PM2 globally..."
npm install -g pm2

echo "Step 4 of 5: Retrying Deployment - Unzipping..."
if [ -f /var/www/migration_package.zip ]; then
    rm -rf /var/www/purple-port
    mkdir -p /var/www/purple-port
    unzip -o -q /var/www/migration_package.zip -d /var/www/purple-port || true
else
    echo "❌ ERROR: migration_package.zip not found! You must run deploy_full_migration.ps1 again."
    exit 1
fi

echo "Step 5 of 5: Starting Application..."
cd /var/www/purple-port
npm install --production
npx prisma generate

# Fix Permissions
chmod -R 777 uploads || true
chmod 666 prisma/dev.db || true

# Start PM2
pm2 delete all || true
NODE_ENV=production pm2 start dist/server.js --name "antigravity-app" --update-env
pm2 save

echo "✅ REPAIR COMPLETE!"
"@

# Sanitize for Linux
$RemoteScript = $RemoteScript -replace "`r", ""

ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -t "$User@$ServerIP" "bash -c '$RemoteScript'"
