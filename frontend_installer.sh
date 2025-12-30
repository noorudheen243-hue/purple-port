#!/bin/bash
# FRONTEND SETUP SCRIPT
# Builds the React App and Configures Nginx

echo ">>> STARTING FRONTEND SETUP..."

# 1. Build Frontend
echo ">>> Installing Client Dependencies..."
cd client
npm install

echo ">>> Creating Frontend Enviroment..."
# We point the API to /api so Nginx can proxy it. 
# This handles the connection to the backend automatically.
echo "VITE_API_URL=/api" > .env

echo ">>> Building React App..."
npm run build

# 2. Deploy to Web Server Folder
echo ">>> Moving files to /var/www/purple-port..."
# Create directory if not exists
mkdir -p /var/www/purple-port
# Clear old files
rm -rf /var/www/purple-port/*
# Copy new build
cp -r dist/* /var/www/purple-port/

# 3. Configure Nginx
echo ">>> Configuring Nginx..."
cat > /etc/nginx/sites-available/default <<EOF
server {
    listen 80;
    server_name _;  # Default catch-all

    root /var/www/purple-port;
    index index.html;

    # Frontend Routes (React Router)
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API Proxy
    location /api {
        # Rewrite /api/foo -> /foo to match backend routes if needed, 
        # BUT usually backend expects /api or we strip it. 
        # Let's assume backend routes are like /api/v1/... or similar.
        # If your backend code has /api prefix in routes, keep it.
        # Based on typical setups, we just pass it through.
        
        proxy_pass http://localhost:10000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 4. Restart Nginx
echo ">>> Restarting Nginx..."
if nginx -t; then
    systemctl restart nginx
    echo "---------------------------------------"
    echo ">>> SUCCESS! Frontend is Live."
    echo ">>> Access your site at: http://$(curl -s ifconfig.me)"
    echo "---------------------------------------"
else
    echo ">>> ERROR: Nginx configuration failed."
fi
