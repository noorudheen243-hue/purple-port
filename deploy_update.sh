#!/bin/bash

# Deploy Script v3.0 — Nginx serves from client/dist directly
set -e

trap 'echo "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; echo ">>> ERROR: Deployment Failed! Fix the error above and try again."; echo "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; exit 1' ERR

echo ">>> Starting Deployment (v3.0)..."

ROOT=/var/www/purple-port

# 1. Pull Latest Code
echo ">>> Pulling latest changes..."
cd "$ROOT"
git fetch --all
git reset --hard origin/main

# 2. Fix execute permissions (previous chown may have stripped exec bits)
echo ">>> Restoring execute permissions..."
[ -d "$ROOT/client/node_modules/.bin" ] && chmod +x "$ROOT/client/node_modules/.bin/"* 2>/dev/null || true
[ -d "$ROOT/server/node_modules/.bin" ] && chmod +x "$ROOT/server/node_modules/.bin/"* 2>/dev/null || true

# 3. Build Frontend
echo ">>> Building Client..."
cd "$ROOT/client"
npm install --legacy-peer-deps
chmod +x node_modules/.bin/* 2>/dev/null || true
NODE_ENV=production npm run build
echo ">>> Verifying client build..."
ls -lht "$ROOT/client/dist/" | head -5

# 4. Ensure nginx is pointing to client/dist
echo ">>> Updating nginx config to serve from client/dist..."
sudo cat > /etc/nginx/sites-available/default << 'NGINXEOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    client_max_body_size 500M;
    proxy_read_timeout 1800s;
    proxy_connect_timeout 1800s;
    proxy_send_timeout 1800s;

    root /var/www/purple-port/client/dist;
    index index.html;

    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        try_files $uri =404;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
NGINXEOF

# 5. Build Backend
echo ">>> Updating Server..."
cd "$ROOT/server"
npm install --legacy-peer-deps
chmod +x node_modules/.bin/* 2>/dev/null || true
rm -rf dist
echo ">>> Compiling TypeScript..."
npm run build
npx prisma generate
npx prisma db push

# 6. Set Permissions & Directories
echo ">>> Fixing Permissions..."
# Ensure backup dir exists
sudo mkdir -p /var/backups/antigravity
sudo chown -R $USER:$USER /var/backups/antigravity
sudo chmod -R 777 /var/backups/antigravity

# Standard folder permissions
sudo chown -R www-data:www-data "$ROOT"
sudo chmod -R 755 "$ROOT"
chmod +x "$ROOT/client/node_modules/.bin/"* 2>/dev/null || true
chmod +x "$ROOT/server/node_modules/.bin/"* 2>/dev/null || true

# 7. PM2 Restart (AFTER all files in place)
echo ">>> Restarting PM2..."
pm2 stop all || true
pm2 delete "qix-api" || true
pm2 delete "purple-port-api" || true
pm2 delete "qix-ads" || true

export NODE_ENV=production
cd "$ROOT/server"
pm2 start dist/server.js --name "qix-api"
pm2 save

# 8. Restart Nginx
echo ">>> Restarting Nginx..."
sudo nginx -t && sudo systemctl restart nginx || echo "Warning: Nginx restart issue"

echo ">>> === Deployment Complete! (v3.0) ==="
echo ">>> Nginx now serving from: /var/www/purple-port/client/dist"
echo ">>> Backup directory ready at: /var/backups/antigravity"
ls -lht "$ROOT/client/dist/" | head -5
