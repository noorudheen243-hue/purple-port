#!/bin/bash
# CONFIGURATION SCRIPT FOR HOSTINGER VPS
# This file automates the .env creation, database setup, and PM2 startup.

echo ">>> STARTING BACKEND SETUP..."

# Go to server directory if not already there
if [ -d "server" ]; then
  cd server
fi

# 1. Install Dependencies
echo ">>> Installing dependencies..."
npm install

# 2. Create .env file
echo ">>> Creating configuration..."
cat > .env <<EOF
DATABASE_URL="postgresql://postgres:im_secure_changeme@localhost:5432/qix_ads_db?schema=public"
JWT_SECRET="super_secret_random_string_123"
PORT=10000
CORS_ORIGIN="*"
EOF

# 3. Database Migration
echo ">>> Initializing Database..."
npx prisma db push

# 4. Build
echo ">>> Building Project..."
npm run build

# 5. Start with PM2
echo ">>> Starting Server..."
pm2 delete qix-api 2>/dev/null || true
pm2 start dist/server.js --name "qix-api"
pm2 save

echo "---------------------------------------"
echo ">>> SUCCESS! Backend is running."
echo "---------------------------------------"
pm2 status
