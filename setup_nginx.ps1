
# Script to Install & Configure Nginx on VPS
$ServerIP = "66.116.224.221"
$User = "root"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   CONFIGURING NGINX ON $ServerIP         " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$RemoteScript = @"
set -e
echo "Step 1 of 3: Installing Nginx..."
apt-get update
apt-get install -y nginx

echo "Step 2 of 3: Applying Configuration..."
cat > /etc/nginx/sites-available/default <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name $ServerIP _;
    
    # Performance & Upload Limits
    client_max_body_size 500M; 
    proxy_read_timeout 1800s; 
    proxy_connect_timeout 1800s;
    proxy_send_timeout 1800s;

    # Root Directory for Frontend
    root /var/www/purple-port/server/public;
    index index.html;

    # 1. Serve Frontend (SPA Support)
    location / {
        try_files \`$uri \`$uri/ /index.html;
    }

    # 2. Proxy API Requests to Node.js
    location /api {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \`$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \`$host;
        proxy_cache_bypass \`$http_upgrade;
        proxy_set_header X-Real-IP \`$remote_addr;
        proxy_set_header X-Forwarded-For \`$proxy_add_x_forwarded_for;
    }
}
EOF

echo "Step 3 of 3: Restarting Nginx..."
nginx -t
systemctl restart nginx

echo "✅ NGINX CONFIGURED SUCCESSFULLY!"
"@

# Sanitize script for Linux (Remove \r)
$RemoteScript = $RemoteScript -replace "`r", ""

# Execute via SSH
ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -t "$User@$ServerIP" "bash -c '$RemoteScript'"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Success! You should now be able to access http://$ServerIP" -ForegroundColor Green
}
else {
    Write-Host "Configuration Failed." -ForegroundColor Red
}
