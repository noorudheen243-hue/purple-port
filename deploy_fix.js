const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const serverIp = '66.116.224.221';
const user = 'root';
const password = 'EzdanAdam@243';
const localZip = path.join(__dirname, 'deploy_package.zip');
const remoteZip = '/root/deploy_package.zip';

// Fix script: unzip with correct structure and restart
const fixScript = `
set -e
echo "=== Checking zip contents ==="
unzip -l /root/deploy_package.zip | head -20

echo "=== Extracting to temp ==="
rm -rf /tmp/deploy_fix
mkdir -p /tmp/deploy_fix
unzip -o /root/deploy_package.zip -d /tmp/deploy_fix/

echo "=== Listing extracted ==="
ls -la /tmp/deploy_fix/

echo "=== Deploying Frontend ==="
REMOTE_PATH=/var/www/purple-port
mkdir -p $REMOTE_PATH/client/dist
rm -rf $REMOTE_PATH/client/dist/*

# Try both possible structures
if [ -d /tmp/deploy_fix/dist ]; then
    echo "Structure: root dist/"
    cp -r /tmp/deploy_fix/dist/* $REMOTE_PATH/client/dist/
elif [ -d /tmp/deploy_fix/client_dist ]; then
    echo "Structure: client_dist/"
    cp -r /tmp/deploy_fix/client_dist/* $REMOTE_PATH/client/dist/
elif [ -d /tmp/deploy_fix/client ]; then
    echo "Structure: client/dist/"
    cp -r /tmp/deploy_fix/client/dist/* $REMOTE_PATH/client/dist/
fi

echo "=== Frontend files ==="
ls -la $REMOTE_PATH/client/dist/ | head -10

echo "=== Deploying Backend ==="
mkdir -p $REMOTE_PATH/server/dist
rm -rf $REMOTE_PATH/server/dist/*

if [ -d /tmp/deploy_fix/server_dist ]; then
    echo "Structure: server_dist/"
    cp -r /tmp/deploy_fix/server_dist/* $REMOTE_PATH/server/dist/
    if [ -d $REMOTE_PATH/server/dist/src ]; then
        mkdir -p $REMOTE_PATH/server/src
        cp -r $REMOTE_PATH/server/dist/src/* $REMOTE_PATH/server/src/
    fi
    if [ -f $REMOTE_PATH/server/dist/package.json ]; then
        cp $REMOTE_PATH/server/dist/package.json $REMOTE_PATH/server/
    fi
    if [ -d $REMOTE_PATH/server/dist/prisma ]; then
        cp $REMOTE_PATH/server/dist/prisma/schema.prisma $REMOTE_PATH/server/prisma/ 2>/dev/null || true
    fi
elif [ -d /tmp/deploy_fix/server ]; then
    echo "Structure: server/dist/"
    cp -r /tmp/deploy_fix/server/dist/* $REMOTE_PATH/server/dist/
fi

echo "=== Backend files ==="
ls -la $REMOTE_PATH/server/dist/ | head -10

echo "=== Running prisma ==="
cd $REMOTE_PATH/server && npx prisma db push --accept-data-loss 2>&1 | tail -5

echo "=== Restarting PM2 ==="
pm2 restart qix-ads-v2.7 || pm2 start $REMOTE_PATH/server/dist/server.js --name qix-ads-v2.7 --cwd $REMOTE_PATH/server

sleep 3
pm2 status

echo "=== Checking Nginx ==="
nginx -t && nginx -s reload

echo "=== Cleanup ==="
rm -f /root/deploy_package.zip
rm -rf /tmp/deploy_fix

echo "DONE"
`;

console.log('Connecting to ' + serverIp + '...');

conn.on('ready', () => {
    console.log('Connected. Uploading zip...');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        sftp.fastPut(localZip, remoteZip, {}, (err) => {
            if (err) throw err;
            console.log('Zip uploaded. Running fix script...');
            conn.exec(fixScript, (err, stream) => {
                if (err) throw err;
                stream.on('close', (code) => {
                    console.log('Exit code:', code);
                    conn.end();
                }).on('data', (data) => {
                    process.stdout.write(data);
                }).stderr.on('data', (data) => {
                    process.stderr.write('STDERR: ' + data);
                });
            });
        });
    });
}).on('error', (err) => {
    console.error('Connection error:', err);
}).connect({
    host: serverIp,
    port: 22,
    username: user,
    password: password
});
