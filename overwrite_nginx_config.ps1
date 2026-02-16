
# Script to Overwrite Nginx Configuration (Fixed Escaping)
$ServerIP = "66.116.224.221"
$User = "root"

Write-Host "Overwriting Nginx Config on $ServerIP (Attempt 2)..." -ForegroundColor Cyan

# Note: We use `backtick $` to prevent PowerShell from expanding Nginx variables.
# We also use <<'EOF' (quoted) in Bash to prevent Bash from expanding them.

$RemoteScript = @"
echo "Step 1 of 3: Writing new Nginx config..."
cat > /etc/nginx/sites-available/default <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name $ServerIP _;
    
    # Performance & Upload Limits
    client_max_body_size 500M; 
    proxy_read_timeout 1800s; 
    proxy_connect_timeout 1800s;
    proxy_send_timeout 1800s;

    # Root Directory for Frontend (CORRECTED PATH)
    root /var/www/purple-port/public;
    index index.html;

    # 1. Serve Frontend (SPA Support)
    location / {
        try_files `$uri `$uri/ /index.html;
    }

    # 2. Proxy API Requests to Node.js
    location /api {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_cache_bypass `$http_upgrade;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
    }
}
EOF

echo "Step 2 of 3: Testing Config..."
nginx -t

echo "Step 3 of 3: Restarting Nginx..."
systemctl restart nginx

echo "✅ NGINX RELOADED SUCCESSFULLY!"
"@

# Sanitize
$RemoteScript = $RemoteScript -replace "`r", ""

ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -t "$User@$ServerIP" "bash -c '$RemoteScript'"
