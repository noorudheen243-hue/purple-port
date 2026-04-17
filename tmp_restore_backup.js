const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

const backupFile = '/var/backups/antigravity/backup-online-2026-03-27T18-50-45-103Z.zip';
const targetDir = '/var/www/purple-port/server';
const tmpExtract = '/tmp/extract-restore';

conn.on('ready', () => {
    console.log('[Backup Restore] Connection established.');
    const cmd = `
        set -e
        echo "1/5 Stopping PM2 services..."
        pm2 stop all

        echo "2/5 Backing up corrupted database..."
        cd ${targetDir}/prisma
        mv dev.db dev.db.corrupted_saved_$(date +%s) || true

        echo "3/5 Extracting backup archive..."
        rm -rf ${tmpExtract}
        mkdir -p ${tmpExtract}
        unzip -o -q ${backupFile} -d ${tmpExtract}

        echo "4/5 Restoring database and uploads..."
        # Note: the backup structure might have database.sqlite directly, or inside prisma/ (depending on how backup works)
        # We will dynamically find database.sqlite inside the extracted dir
        DB_SOURCE=$(find ${tmpExtract} -name "database.sqlite" | head -n 1)
        if [ -n "$DB_SOURCE" ]; then
            cp $DB_SOURCE ${targetDir}/prisma/dev.db
            echo "Database restored from $DB_SOURCE."
        else
            echo "Failed to locate database.sqlite in backup!"
            exit 1
        fi

        if [ -d "${tmpExtract}/uploads" ]; then
            echo "Restoring uploads..."
            cp -r ${tmpExtract}/uploads/* ${targetDir}/uploads/ || true
        else
            echo "No uploads directory found in backup, skipping."
        fi

        echo "5/5 Restarting PM2 services..."
        pm2 delete qix-api || true
        pm2 restart qix-backend || pm2 start /var/www/purple-port/server/dist/server.js --name qix-backend
        pm2 save

        rm -rf ${tmpExtract}
        echo "✅ RESTORATION COMPLETE!"
    `;

    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log(`[Backup Restore] Process closed with code ${code}`);
            conn.end();
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
