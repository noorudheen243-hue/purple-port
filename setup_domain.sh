#!/bin/bash
# DOMAIN SETUP SCRIPT
# Configures Nginx for a custom domain and installs SSL

# Check if domain argument is provided
if [ -z "$1" ]; then
    echo "Using default/interactive mode..."
    read -p "Enter your domain name (e.g., qixpurpleport.com): " DOMAIN_NAME
else
    DOMAIN_NAME=$1
fi

if [ -z "$DOMAIN_NAME" ]; then
    echo "Error: Domain name is required."
    exit 1
fi

echo ">>> Configuring Nginx for domain: $DOMAIN_NAME"

# 1. Update Nginx Config
cat > /etc/nginx/sites-available/default <<EOF
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    root /var/www/purple-port;
    index index.html;

    # Frontend Routes (React Router)
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API Proxy
    location /api {
        proxy_pass http://localhost:10000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 2. Update Backend Environment (CLIENT_URL)
echo ">>> Updating Server Environment Variables..."
SERVER_ENV_FILE="/root/purple-port/server/.env"

# Check if file exists, then replace or append CLIENT_URL
if [ -f "$SERVER_ENV_FILE" ]; then
    # Remove existing CLIENT_URL line if present
    sed -i '/^CLIENT_URL=/d' "$SERVER_ENV_FILE"
    # Append new CLIENT_URL
    echo "CLIENT_URL=https://$DOMAIN_NAME" >> "$SERVER_ENV_FILE"
    echo ">>> Updated CLIENT_URL to https://$DOMAIN_NAME"
else
    echo ">>> WARNING: Server .env not found at $SERVER_ENV_FILE"
fi

# 3. Test and Restart Nginx
echo ">>> Testing Nginx Configuration..."
if nginx -t; then
    systemctl restart nginx
    echo ">>> Nginx configured."
else
    echo ">>> ERROR: Nginx config check failed. Reverting..."
    exit 1
fi

# 3. Install Certbot (if not present) and run it
echo ">>> Checking for Certbot (SSL Tool)..."
if ! command -v certbot &> /dev/null; then
    echo ">>> Installing Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

echo ">>> requesting SSL Certificate..."
echo ">>> Follow the prompts on screen if asked."
certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos -m admin@$DOMAIN_NAME --redirect

# 5. Restart Backend to apply Env changes
echo ">>> Restarting Backend API..."
pm2 restart qix-api

echo "---------------------------------------"
echo ">>> SUCCESS! Your domain is live at: https://$DOMAIN_NAME"
echo "---------------------------------------"
