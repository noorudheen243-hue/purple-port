<#
.SYNOPSIS
    Deploys the application to the VPS, wiping the existing remote installation.
.DESCRIPTION
    1. Pushes local changes to GitHub (Safely - does NOT affect local data).
    2. Connects to VPS via SSH.
    3. Wipes the remote folder.
    4. Re-clones and reinstalls.
.NOTES
    - Local 'dev.db' (SQLite) is git-ignored and will NOT be touched.
    - Remote data WILL be deleted as requested.
#>

$VPS_IP = "66.116.224.221"
$VPS_USER = "root"

Write-Host "--- DANGER: This will WIPE the application on $VPS_IP ---" -ForegroundColor Red
Write-Host "--- Local data (f:\Antigravity) is SAFE and will be preserved ---" -ForegroundColor Green
$confirmation = Read-Host "Are you sure you want to proceed? (Type 'yes')"

if ($confirmation -ne 'yes') {
    Write-Host "Deployment cancelled."
    exit
}

# 1. Push Local Changes
Write-Host "`n[1/3] Pushing local changes to GitHub..." -ForegroundColor Cyan
git add .
git commit -m "Fresh deployment sync" 2>$null # Ignore error if nothing to commit
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "Git push failed. Please check your git status." -ForegroundColor Red
    exit
}

# 2. Define Remote Commands (Using Here-String @' ... '@ to avoid escaping hell)
$RemoteCommands = @'
    set -e
    
    APP_DIR="/var/www/purple-port"
    BACKUP_DIR="$HOME/backups"
    
    echo "--- [Remote] Stopping App ---"
    pm2 delete all || true
    
    echo "--- [Remote] Backing up .env ---"
    mkdir -p "$BACKUP_DIR"
    cp "$APP_DIR/server/.env" "$BACKUP_DIR/env.backup_$(date +%s)" || echo "No .env to backup"
    
    echo "--- [Remote] Wiping Old App ---"
    rm -rf "$APP_DIR"
    
    echo "--- [Remote] Cloning Fresh Code ---"
    git clone https://github.com/noorudheen243-hue/purple-port.git "$APP_DIR"
    
    echo "--- [Remote] Restoring .env ---"
    # Find the latest backup file
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/env.backup_* 2>/dev/null | head -n1)
    
    if [ -n "$LATEST_BACKUP" ]; then
        cp "$LATEST_BACKUP" "$APP_DIR/server/.env"
        echo "Restored .env from $LATEST_BACKUP"
    else
        echo "WARNING: No .env backup found! You may need to create it manually."
        # Create empty .env to avoid build errors if it depends on it, or just warn
        touch "$APP_DIR/server/.env"
    fi
    
    echo "--- [Remote] Installing & Building ---"
    cd "$APP_DIR/server"
    npm install
    npx prisma generate
    npm run build
    
    echo "--- [Remote] Pushing DB Schema (Resetting Remote DB) ---"
    # This creates a fresh SQLite DB if using SQLite, or resets Postgres/MySQL
    npx prisma db push --accept-data-loss 
    
    echo "--- [Remote] Starting App ---"
    pm2 start dist/server.js --name "purple-port-server"
    pm2 save
'@

# 3. Execute SSH
Write-Host "`n[2/3] Connecting to VPS... (Please enter SSH password when prompted)" -ForegroundColor Cyan
# Pass the commands directly to SSH
ssh $VPS_USER@$VPS_IP "$RemoteCommands"

Write-Host "`n[3/3] Deployment script finished." -ForegroundColor Green
