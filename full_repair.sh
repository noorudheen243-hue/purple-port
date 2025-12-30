#!/bin/bash
# MASTER REPAIR SCRIPT
# 1. Updates Code
# 2. Resets Database & Seeds Data
# 3. Rebuilds Frontend & Backend
# 4. Restarts Services

echo ">>> STARTING FULL SYSTEM REPAIR..."

# 1. Update Code
echo ">>> Pulling latest code..."
git pull

# 2. Server Repair
echo ">>> Repairing Backend & Database..."
cd server
npm install
npx prisma generate
npx prisma db push
echo ">>> Seeding Database (Creating Users)..."
npx prisma db seed

echo ">>> Rebuilding Backend..."
npm run build

# 3. Client Repair
echo ">>> Repairing Frontend..."

# Try to detect Domain from Server Config
SERVER_ENV="../server/.env"
API_URL="http://localhost:4001/api" # Default

if [ -f "$SERVER_ENV" ]; then
    # Extract CLIENT_URL if it exists
    DETECTED_URL=$(grep "^CLIENT_URL=" "$SERVER_ENV" | cut -d '=' -f2)
    if [ ! -z "$DETECTED_URL" ]; then
        API_URL="${DETECTED_URL}/api"
        echo ">>> Detected Production URL: $API_URL"
    fi
fi

cd ../client
npm install
echo ">>> Building Frontend with VITE_API_URL=$API_URL"
VITE_API_URL=$API_URL npm run build

# Deploy Frontend
rm -rf /var/www/purple-port/*
cp -r dist/* /var/www/purple-port/

# 4. Restart All
echo ">>> Restarting All Services..."
cd ..
pm2 restart qix-api
systemctl restart nginx

# 5. Verify Data
echo ">>> VERIFICATION: Current Users in DB:"
cd server
npx ts-node src/scripts/list_users.ts

echo "---------------------------------------"
echo ">>> REPAIR COMPLETE."
echo ">>> You should see a list of users above."
echo "---------------------------------------"
