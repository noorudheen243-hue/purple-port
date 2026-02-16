
# Final Nginx Fix - Base64 Encoded to prevent ALL shell errors
$ServerIP = "66.116.224.221"
$User = "root"

Write-Host "Applying Foolproof Nginx Fix to $ServerIP..." -ForegroundColor Cyan

# 1. Define the Bash Script content (using PowerShell Here-String)
# We handle escaping carefully:
# - $ServerIP needs to be expanded by PowerShell -> $ServerIP
# - Nginx variables ($host, $uri) need to be escaped for PowerShell -> `$host
$RawBashScript = @"
set -e
echo "Step 1: Overwriting Nginx Config..."
cat > /etc/nginx/sites-available/default <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name $ServerIP _;
    
    client_max_body_size 500M; 
    proxy_read_timeout 1800s; 
    proxy_connect_timeout 1800s;
    proxy_send_timeout 1800s;

    # Correct Root Path
    root /var/www/purple-port/public;
    index index.html;

    location / {
        try_files `$uri `$uri/ /index.html;
    }

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

echo "Step 2: verifying..."
nginx -t

echo "Step 3: Restarting..."
systemctl restart nginx

echo "✅ SUCCESS: Nginx is fixed and running!"
"@

# 2. Encode to Base64 to bypass SSH/Bash quoting hell
$Bytes = [System.Text.Encoding]::UTF8.GetBytes($RawBashScript)
$Encoded = [Convert]::ToBase64String($Bytes)

# 3. Execute Remote
# We echo the base64 string, decode it, and pipe to bash
$Command = "echo '$Encoded' | base64 -d | bash"

ssh -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -t "$User@$ServerIP" $Command
