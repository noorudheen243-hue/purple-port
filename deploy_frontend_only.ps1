
$VPS_IP = "66.116.224.221"
$VPS_USER = "root"
$LOCAL_CLIENT_DIR = "f:\Antigravity\client"
$REMOTE_TARGET_DIR = "/var/www/purple-port/server/public"

Write-Host "--- FRONTEND DEPLOYMENT STARTED ---" -ForegroundColor Cyan

# 1. Build Client Locally
Write-Host "`n[1/4] Building Client Locally..."
Set-Location $LOCAL_CLIENT_DIR
# Only run install if needed, to save time. But better safe than sorry.
# npm install 
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build Failed. Aborting." -ForegroundColor Red
    exit
}

# 2. Compress Build
Write-Host "`n[2/4] Compressing Build Artifacts..."
# Generate Version File
$Date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"Deployed: $Date" | Out-File "$LOCAL_CLIENT_DIR\dist\version.txt" -Encoding utf8

if (Test-Path "$LOCAL_CLIENT_DIR\dist.zip") { Remove-Item "$LOCAL_CLIENT_DIR\dist.zip" }
Compress-Archive -Path "$LOCAL_CLIENT_DIR\dist\*" -DestinationPath "$LOCAL_CLIENT_DIR\dist.zip" -Force

# 3. Upload to VPS
# 3. Upload to VPS
Write-Host "`n[3/4] Uploading to VPS..."
$KEY_PATH = Resolve-Path "$PSScriptRoot\deploy_key"
scp -i $KEY_PATH -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no "$LOCAL_CLIENT_DIR\dist.zip" "${VPS_USER}@${VPS_IP}:/var/www/purple-port/dist.zip"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Upload Failed." -ForegroundColor Red
    exit
}

# 4. Extract and Restart on VPS
Write-Host "`n[4/4] Extracting and Refreshing on VPS..."
$RemoteScript = "
    echo '--- Remote Script Started ---'
    # Ensure target directory exists
    mkdir -p $REMOTE_TARGET_DIR
    
    # Clean old files
    rm -rf $REMOTE_TARGET_DIR/*
    
    # Unzip new files (Check if unzip exists, if not install it)
    if ! command -v unzip &> /dev/null; then
        apt-get update && apt-get install -y unzip
    fi
    
    echo 'Unzipping...'
    unzip -o /var/www/purple-port/dist.zip -d $REMOTE_TARGET_DIR
    
    # Cleanup zip
    rm /var/www/purple-port/dist.zip
    
    # Restart Nginx to clear any aggressive caching
    systemctl restart nginx
    
# Verification
    echo '--- [Remote] Verification: File Timestamp ---'
    ls -la $REMOTE_TARGET_DIR/index.html
    
    echo '✅ Frontend Updated & Nginx Restarted'
"

# CRITICAL: Fix Windows Line Endings (CRLF) -> Linux (LF)
$RemoteScript = $RemoteScript -replace "`r`n", "`n"

# Use absolute path for key to avoid "not found" errors
$KEY_PATH = Resolve-Path "$PSScriptRoot\deploy_key"

ssh -i $KEY_PATH -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" $RemoteScript

Write-Host "`n--- DEPLOYMENT COMPLETE! ---" -ForegroundColor Green
Write-Host "Please do a Hard Refresh (Ctrl + F5) on your browser to see the Green Save Buttons."
