const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';
const localZip = process.argv[2] || 'f:\\Antigravity\\deploy_restored.tar.gz';
const remoteZip = '/root/deploy_package.tar.gz';
const remotePath = '/var/www/purple-port';

console.log('Connecting to VPS...');

conn.on('ready', () => {
    console.log('Client :: ready');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        console.log('SFTP :: ready. Uploading deploy_package.zip...');

        // Check if local file exists
        if (!fs.existsSync(localZip)) {
            console.error('Local zip file missing!');
            conn.end();
            return;
        }

        sftp.fastPut(localZip, remoteZip, {}, (err) => {
            if (err) {
                console.error('Upload failed', err);
                conn.end();
                return;
            }
            console.log('Upload complete. Executing deployment script...');

            const remoteCmd = `
        REMOTE_PATH="/var/www/purple-port"
        
        echo "-> Extracting files..."
        mkdir -p $REMOTE_PATH/updated_files
        rm -rf $REMOTE_PATH/updated_files/*
        tar -xzf /root/deploy_package.tar.gz -C $REMOTE_PATH/updated_files/
        rm /root/deploy_package.tar.gz

        echo "-> Updating Frontend..."
        mkdir -p $REMOTE_PATH/server/public
        rm -rf $REMOTE_PATH/server/public/*
        cp -r $REMOTE_PATH/updated_files/client_dist/* $REMOTE_PATH/server/public/

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
        rm -f $REMOTE_PATH/server/package.json

        echo "-> Applying Database Schema Changes..."
        cd $REMOTE_PATH/server
        npx prisma db push --accept-data-loss

        echo "-> Running Task Migration..."
        cp $REMOTE_PATH/updated_files/server_dist/migrate_tasks.js $REMOTE_PATH/server/
        node migrate_tasks.js
        rm migrate_tasks.js

        echo "-> Running Debug Counts..."
        cp $REMOTE_PATH/updated_files/server_dist/debug_counts.js $REMOTE_PATH/server/
        node debug_counts.js
        rm debug_counts.js

        echo "-> Restarting PM2..."
        pm2 restart qix-backend || pm2 start dist/server.js --name qix-backend
      `;
            conn.exec(remoteCmd, (err, stream) => {
                if (err) throw err;
                stream.on('close', (code, signal) => {
                    console.log('Deployment stream closed with code ' + code);
                    conn.end();
                }).on('data', (data) => {
                    process.stdout.write(data.toString());
                }).stderr.on('data', (data) => {
                    process.stderr.write(data.toString());
                });
            });
        });
    });
}).connect({
    host: serverIp,
    port: 22,
    username: username,
    password: password
});
