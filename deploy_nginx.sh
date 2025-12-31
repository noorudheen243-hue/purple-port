
#!/bin/bash

# Configuration
DOMAIN="72.61.246.22" # Or your domain
APP_PORT=4001
CONFIG_FILE="/etc/nginx/sites-available/default"

echo "--- Setting up Nginx Reverse Proxy ---"

# 1. Update Nginx Config
# We use 'default' to catch the IP address traffic
cat <<EOF > nginx_config.tmp
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name $DOMAIN _;

    root /var/www/purple-port/server/public;
    index index.html;

    # 1. Serve Frontend (SPA Support)
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 2. Proxy API Requests to Node.js
    location /api {
        proxy_pass http://localhost:$APP_PORT;
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

# 2. Apply Config (Requires Sudo)
echo "Applying configuration..."
sudo mv nginx_config.tmp $CONFIG_FILE

# 3. Test and Restart
echo "Testing Nginx config..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "Restarting Nginx..."
    sudo systemctl restart nginx
    echo "✅ SUCCESS: Nginx is now proxying /api to Port $APP_PORT"
else
    echo "❌ ERROR: Nginx config test failed."
fi
