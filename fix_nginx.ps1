$VPS_IP = "66.116.224.221"
$VPS_USER = "root"
$KEY_PATH = Resolve-Path "$PSScriptRoot\deploy_key"
$LOCAL_CONFIG = Resolve-Path "$PSScriptRoot\nginx_vps.conf"

Write-Host "--- NGINX FIX STARTED ---" -ForegroundColor Cyan

# 1. Upload Config to /tmp
Write-Host "`n[1/3] Uploading Config..."
scp -i $KEY_PATH -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no "$LOCAL_CONFIG" "${VPS_USER}@${VPS_IP}:/tmp/nginx_vps.conf"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Upload Failed." -ForegroundColor Red
    exit
}

# 2. Apply Config on VPS
Write-Host "`n[2/3] Applying Config on VPS..."
$RemoteScript = "
    echo '--- Remote Script Started ---'
    
    # Move to correct location
    mv /tmp/nginx_vps.conf /etc/nginx/sites-available/purple-port
    
    # Enable site
    ln -sf /etc/nginx/sites-available/purple-port /etc/nginx/sites-enabled/
    
    # Remove default if exists
    rm -f /etc/nginx/sites-enabled/default
    
    # Test Config
    nginx -t
    
    # Reload Nginx
    systemctl reload nginx
    
    echo '✅ Nginx Config Updated & Reloaded'
"

# Fix Line Endings for Linux
$RemoteScript = $RemoteScript -replace "`r`n", "`n"

ssh -i $KEY_PATH -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" $RemoteScript

Write-Host "`n--- FIX COMPLETE! ---" -ForegroundColor Green
Write-Host "Refresh your browser. The App should load correctly now."
