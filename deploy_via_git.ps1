
# Configuration
$VPS_IP = "66.116.224.221"
$VPS_USER = "root"

Write-Host "--- GIT DEPLOYMENT STARTED ---" -ForegroundColor Cyan

# 1. Local Git Push
Write-Host "`n[1/2] Pushing Local Changes to GitHub..."
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Git Push Failed. Please fix merge conflicts or pull first." -ForegroundColor Red
    exit
}

# 2. Remote Build & Deploy
Write-Host "`n[2/2] Triggering Remote Build on VPS..."

# Define commands as array and join with semicolon to avoid CRLF (\r\n) issues on Linux
$Commands = @(
    "set -e", # Exit on error
    "echo '--- [Remote] Pulling Latest Code ---'",
    "cd /var/www/purple-port",
    "git reset --hard origin/main",
    "git pull origin main",
    "echo '--- [Remote] Installing Dependencies ---'",
    "cd client",
    "npm install --legacy-peer-deps", # Install ALL deps (including tsc)
    "echo '--- [Remote] Building Client ---'",
    "npm run build",
    "echo '--- [Remote] Deploying to Nginx Public Dir ---'",
    "mkdir -p ../server/public",
    "rm -rf ../server/public/*", # Clear old files
    "cp -r dist/* ../server/public/",
    "echo '--- [Remote] Restarting Nginx ---'",
    "systemctl restart nginx",
    "echo '--- [Remote] Verification: File Timestamp ---'",
    "ls -la ../server/public/index.html",
    "echo '✅ SUCCESS: Deployment Complete!'"
) -join "; "

# Execute via SSH (using -t to force pseudo-terminal for consistent output)
ssh -i deploy_key -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa "${VPS_USER}@${VPS_IP}" "$Commands"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n--- DEPLOYMENT FINISHED SUCCESSFULLY ---" -ForegroundColor Green
    Write-Host "Please do a Hard Refresh (Ctrl + F5) on your browser."
}
else {
    Write-Host "`n❌ Remote Deployment Failed." -ForegroundColor Red
}
