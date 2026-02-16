
# Setup Full VPS Environment (Node, Nginx, PM2, Firewall)
$ServerIP = "66.116.224.221"
$User = "root"
$KeyPath = "$PSScriptRoot\deploy_key"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   SETTING UP VPS ENVIRONMENT ON $ServerIP" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Define the Remote Bash Script (Base64 Encoded to avoid string escaping issues)
$RawBashScript = @"
#!/bin/bash
set -e

# 1. Update & Install Basics
echo "-> [Remote] Updating System..."
apt-get update -y
apt-get install -y curl unzip git ufw

# 2. Install Node.js 20
echo "-> [Remote] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "   Node.js already installed."
fi

# 3. Install PM2
echo "-> [Remote] Installing PM2..."
npm install -g pm2

# 4. Install & Configure Nginx
echo "-> [Remote] Installing Nginx..."
apt-get install -y nginx

echo "-> [Remote] Configuring Nginx..."
cat > /etc/nginx/sites-available/default <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;
    
    client_max_body_size 500M; 
    proxy_read_timeout 1800s; 

    # Root Path (Frontend)
    root /var/www/purple-port/public;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

nginx -t
systemctl restart nginx

# 5. Setup Firewall
echo "-> [Remote] Configuring Firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
# ufw enable # CAUTION: specific to this environment, might prompt. Nginx works without explicit enable usually if no firewall active.
# We'll just allow ports.
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

echo "✅ VPS ENVIRONMENT READY!"
"@

# Encode Script
if ($RawBashScript.Contains("`r")) { $RawBashScript = $RawBashScript -replace "`r", "" }
$Bytes = [System.Text.Encoding]::UTF8.GetBytes($RawBashScript)
$Encoded = [Convert]::ToBase64String($Bytes)

# Execute
$SSHOptions = "-i ""$KeyPath"" -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -o StrictHostKeyChecking=no"
$Command = "echo '$Encoded' | base64 -d | bash"

ssh $SSHOptions -t "$User@$ServerIP" $Command

Write-Host "Done. You can now deploy." -ForegroundColor Green
