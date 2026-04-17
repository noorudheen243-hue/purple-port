#!/bin/bash
REMOTE_PATH=/var/www/purple-port
mkdir -p $REMOTE_PATH/updated_files
rm -rf $REMOTE_PATH/updated_files/*
unzip /root/deploy_package.zip -d $REMOTE_PATH/updated_files/
rm /root/deploy_package.zip

echo "-> Updating Frontend..."
mkdir -p $REMOTE_PATH/client/dist
rm -rf $REMOTE_PATH/client/dist/*
cp -r $REMOTE_PATH/updated_files/client_dist/* $REMOTE_PATH/client/dist/

echo "-> Updating Backend & Data..."
mkdir -p $REMOTE_PATH/server/dist
rm -rf $REMOTE_PATH/server/dist/*
cp -r $REMOTE_PATH/updated_files/server_dist/* $REMOTE_PATH/server/dist/

if [ -d $REMOTE_PATH/updated_files/server_dist/src ]; then
    echo "-> Updating Backend Source..."
    mkdir -p $REMOTE_PATH/server/src
    rm -rf $REMOTE_PATH/server/src/*
    cp -r $REMOTE_PATH/updated_files/server_dist/src/* $REMOTE_PATH/server/src/
fi

if [ -d $REMOTE_PATH/updated_files/server_dist/prisma ]; then
    echo "-> Updating Prisma Schema..."
    mkdir -p $REMOTE_PATH/server/prisma
    cp $REMOTE_PATH/updated_files/server_dist/prisma/schema.prisma $REMOTE_PATH/server/prisma/
fi

cp $REMOTE_PATH/updated_files/server_dist/package.json $REMOTE_PATH/server/

if [ ! -f $REMOTE_PATH/server/.env ] && [ -f $REMOTE_PATH/.env ]; then
    cp $REMOTE_PATH/.env $REMOTE_PATH/server/.env
fi

echo "-> Applying Database Schema Changes..."
cd $REMOTE_PATH/server
npx prisma db push --accept-data-loss

echo "-> Restarting PM2..."
pm2 restart qix-ads-v2.7 || pm2 start dist/server.js --name qix-ads-v2.7

echo "DEPLOYMENT COMPLETE"
