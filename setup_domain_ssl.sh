#!/bin/bash
set -e

DOMAIN="port.qixads.com"
EMAIL="admin@qixads.com" # Adjust if needed or take as arg

echo "=========================================="
echo "   SETTING UP SSL FOR $DOMAIN"
echo "=========================================="

# 1. Install Certbot (if not present)
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
else
    echo "Certbot is already installed."
fi

# 2. Create Nginx Config
CONFIG_FILE="/etc/nginx/sites-available/$DOMAIN"
SYMLINK_FILE="/etc/nginx/sites-enabled/$DOMAIN"

echo "Creating Nginx configuration at $CONFIG_FILE..."

# We create a basic HTTP config first to allow Certbot to validate
cat > "$CONFIG_FILE" <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    root /var/www/purple-port/public; # Assuming frontend files are here
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:4001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 3. Enable Site
if [ ! -f "$SYMLINK_FILE" ]; then
    ln -s "$CONFIG_FILE" "$SYMLINK_FILE"
    echo "Site enabled."
fi

# 4. Reload Nginx to load new config
nginx -t && systemctl reload nginx
echo "Nginx reloaded with HTTP config."

# 5. Run Certbot to get SSL
# --nginx: Use Nginx plugin
# --non-interactive: Don't ask questions
# --agree-tos: Agree to terms
# --redirect: Force HTTPS redirection automatically
# -m: Email for renewal warnings

echo "Requesting SSL Certificate..."
certbot --nginx --non-interactive --agree-tos --redirect -m "$EMAIL" -d "$DOMAIN"

echo "=========================================="
echo "   SSL SETUP COMPLETE!"
echo "   Visit https://$DOMAIN to verify."
echo "=========================================="
