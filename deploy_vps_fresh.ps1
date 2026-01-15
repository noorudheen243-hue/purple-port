
# Deploy to VPS - Fresh Start
$Server = "root@72.61.246.22"
$ProjectDir = "/root/Antigravity/server" # Adjust if your path differs
$ClientDir = "/root/Antigravity/client"

Write-Host "Starting Fresh Deployment to $Server..." -ForegroundColor Cyan

# Define the remote cleanup and deploy script
$RemoteScript = @"
set -e # Exit on error

echo "[1/6] Stopping Services..."
pm2 delete all || true

echo "[2/6] Backing up Environment..."
# Assuming .env exists in server root
if [ -f $ProjectDir/.env ]; then
  cp $ProjectDir/.env /root/env.backup
  echo "Backup saved."
else
  echo "WARNING: No .env found! You may need to create it."
fi

echo "[3/6] Refreshing Codebase..."
cd $ProjectDir/..
git fetch origin
git reset --hard origin/main
git clean -fd # Remove untracked files (Clean slate)

# Restore Env
if [ -f /root/env.backup ]; then
  mv /root/env.backup $ProjectDir/.env
fi

echo "[4/6] Backend: Resetting Database & Building..."
cd $ProjectDir
npm install
rm -f prisma/dev.db # WIPE DB
npx prisma migrate deploy # Create Schema
npx prisma db seed # Seed Users
npm run build

echo "[5/6] Frontend: Building..."
cd $ClientDir
npm install
npm run build
# If serving via Nginx, copy files. If PM2:
# npm run preview or similar? 
# Assuming standard React build + Nginx, we'll leave build artifacts here.

echo "[6/6] Restarting Services..."
cd $ProjectDir
pm2 start dist/server.js --name "qix-backend"
pm2 save

echo "✅ Fresh Deployment Complete!"
"@

# Execute via SSH
ssh -t $Server "bash -c '$RemoteScript'"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment Successful!" -ForegroundColor Green
}
else {
    Write-Host "Deployment Failed. Please check logs." -ForegroundColor Red
}
