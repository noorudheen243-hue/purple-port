#!/bin/bash
REMOTE_PATH="/var/www/antigravity"

echo "Extracting..."
mkdir -p $REMOTE_PATH/updated_files
rm -rf $REMOTE_PATH/updated_files/*
unzip -o /root/deploy_package.zip -d $REMOTE_PATH/updated_files/
rm /root/deploy_package.zip

echo "Updating Frontend..."
mkdir -p $REMOTE_PATH/server/public
rm -rf $REMOTE_PATH/server/public/*
cp -r $REMOTE_PATH/updated_files/client_dist/* $REMOTE_PATH/server/public/

echo "Updating Backend..."
mkdir -p $REMOTE_PATH/server/dist
rm -rf $REMOTE_PATH/server/dist/*
cp -r $REMOTE_PATH/updated_files/server_dist/* $REMOTE_PATH/server/dist/

if [ -d $REMOTE_PATH/updated_files/server_dist/src ]; then
    mkdir -p $REMOTE_PATH/server/src
    rm -rf $REMOTE_PATH/server/src/*
    cp -r $REMOTE_PATH/updated_files/server_dist/src/* $REMOTE_PATH/server/src/
fi

if [ -d $REMOTE_PATH/updated_files/server_dist/prisma ]; then
    mkdir -p $REMOTE_PATH/server/prisma
    cp $REMOTE_PATH/updated_files/server_dist/prisma/schema.prisma $REMOTE_PATH/server/prisma/
fi

cp $REMOTE_PATH/updated_files/server_dist/package.json $REMOTE_PATH/server/

echo "Restarting PM2..."
cd $REMOTE_PATH/server
pm2 restart qix-ads-v2.6 || pm2 start dist/server.js --name qix-ads-v2.6

echo "Deployment Successful!"
