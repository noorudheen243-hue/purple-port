#!/bin/bash

echo "🚀 Starting Full Deployment..."

# 1. Update Codebase
echo "📥 Pulling latest code..."
git pull origin main

# 2. Build Client
echo "🏗️  Building Frontend..."
cd client
npm install
npm install react-draggable @types/react-draggable --force # Force install to ensure it exists
npm run build
cd ..

# 3. Build Server
echo "🏗️  Building Backend..."
cd server
npm install
npm run build

# 4. Integrate (Copy Client Build to Server Public)
echo "🔗 Integration: Copying Client to Server Public folder..."
rm -rf public
mkdir -p public
cp -r ../client/dist/* public/

# 5. Restart Application
echo "🔄 Restarting Server..."
pm2 restart qix-backend

echo "✅ Deployment Complete! App is live."
