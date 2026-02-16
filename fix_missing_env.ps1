
# Script to Fix Missing .ENV File
$ServerIP = "66.116.224.221"
$User = "root"
$LocalEnvPath = "f:\Antigravity\server\.env"
$RemoteEnvPath = "/var/www/purple-port/.env"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   FIXING MISSING .ENV ON $ServerIP       " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Prepare Production .env content
# We will read the local file but change CLIENT_URL to the VPS IP
$EnvContent = Get-Content $LocalEnvPath -Raw
$EnvContent = $EnvContent -replace "http://localhost:5173", "http://66.116.224.221"

# Save temporary production .env
$TempEnvFile = "f:\Antigravity\.env.production.temp"
$EnvContent | Set-Content $TempEnvFile -NoNewline

Write-Host "-> Uploading .env file..."
scp -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa "$TempEnvFile" "${User}@${ServerIP}:$RemoteEnvPath"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to upload .env file!"
    exit 1
}

# Remove temp file
Remove-Item $TempEnvFile

# 2. Restart App to Load Env
Write-Host "-> Restarting Application..."
$RemoteScript = @"
echo "Reloading Environment Variables..."
cd /var/www/purple-port
pm2 delete all || true
NODE_ENV=production pm2 start dist/server.js --name "antigravity-app" --update-env
pm2 save
echo "✅ APPLICATION RESTARTED WITH .ENV!"
"@

# Sanitize
$RemoteScript = $RemoteScript -replace "`r", ""

ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -t "$User@$ServerIP" "bash -c '$RemoteScript'"
