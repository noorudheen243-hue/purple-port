#!/bin/bash
REMOTE_PATH="/var/www/purple-port"
APP_NAME="qix-ads-v2.7"

echo "🎯 Final Attempt for $APP_NAME..."

mkdir -p $REMOTE_PATH/updated_files
rm -rf $REMOTE_PATH/updated_files/*
unzip -o ~/deploy_package.zip -d $REMOTE_PATH/updated_files/
rm ~/deploy_package.zip

echo "-> Updating Frontend (/public)..."
cp -r $REMOTE_PATH/updated_files/client_dist/* $REMOTE_PATH/public/

echo "-> Updating Backend (/server/dist)..."
mkdir -p $REMOTE_PATH/server/dist
cp -r $REMOTE_PATH/updated_files/server_dist/* $REMOTE_PATH/server/dist/
mkdir -p $REMOTE_PATH/server/prisma
cp $REMOTE_PATH/updated_files/server_dist/prisma/schema.prisma $REMOTE_PATH/server/prisma/
cp $REMOTE_PATH/updated_files/server_dist/package.json $REMOTE_PATH/server/

echo "-> Applying Database Changes..."
cd $REMOTE_PATH/server
npx prisma db push --accept-data-loss

echo "-> Restarting Server..."
pm2 restart $APP_NAME || pm2 start dist/server.js --name $APP_NAME
printf "✅ Done!"
