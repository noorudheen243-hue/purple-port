const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';
const localPackage = path.join(__dirname, 'deploy_package.tar.gz');
const remotePackage = '/root/deploy_package.tar.gz';
const remotePath = '/var/www/purple-port';

console.log('Connecting to VPS for deployment...');

conn.on('ready', () => {
    console.log('Client :: ready');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        console.log('SFTP :: ready. Uploading ' + localPackage + '...');

        if (!fs.existsSync(localPackage)) {
            console.error('Local package file missing! Please build first.');
            conn.end();
            return;
        }

        sftp.fastPut(localPackage, remotePackage, {}, (err) => {
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
        tar -xzf ${remotePackage} -C $REMOTE_PATH/updated_files/
        rm ${remotePackage}

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

        echo "-> Applying Database Schema Changes..."
        cd $REMOTE_PATH/server
        npx prisma db push --accept-data-loss

        echo "-> Seeding Attendance Criteria Rules..."
        # Running the seed script directly from src folder using ts-node
        cat $REMOTE_PATH/server/src/scripts/seed_attendance_criteria.ts
        npx ts-node src/scripts/seed_attendance_criteria.ts

        echo "-> Restarting PM2..."
        pm2 restart qix-ads-v2.7 || pm2 start dist/server.js --name qix-ads-v2.7

        echo "-> Deployment Cleanup..."
        rm -rf $REMOTE_PATH/updated_files
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
