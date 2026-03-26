const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    // 1. Stop both
    // 2. Clear port 4001 just in case
    // 3. Attempt SQLite repair
    const cmd = `
        pm2 stop all
        fuser -k 4001/tcp || true
        
        cd /var/www/purple-port/server/prisma
        echo "-> Attempting Database Repair..."
        sqlite3 dev.db ".recover" | sqlite3 dev_repaired.db
        
        if [ -f dev_repaired.db ]; then
            echo "-> Repair successful. Swapping databases..."
            mv dev.db dev.db.corrupted_$(date +%s)
            mv dev_repaired.db dev.db
        else
            echo "-> Repair tool failed or produced no output. Trying integrity check..."
            sqlite3 dev.db "PRAGMA integrity_check;"
        fi
        
        echo "-> Consolidating PM2 processes..."
        pm2 delete qix-api || true
        
        echo "-> Ensuring correct .env path..."
        sed -i 's|DATABASE_URL="file:./dev.db"|DATABASE_URL="file:./prisma/dev.db"|' /var/www/purple-port/server/.env
    `;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log('Repair and Consolidation complete.');
            console.log('Restarting qix-backend...');
            conn.exec('pm2 restart qix-backend || pm2 start /var/www/purple-port/server/dist/server.js --name qix-backend', (err, stream2) => {
                stream2.on('close', () => {
                    conn.end();
                }).on('data', (data) => process.stdout.write(data.toString()));
            });
        }).on('data', (data) => {
            process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });
    });
}).connect({
    host: serverIp,
    port: 22,
    username: username,
    password: password
});
