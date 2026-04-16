const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    const cmd = `pm2 status && echo "---LOGS---" && pm2 logs qix-ads-v2.7 --lines 40 --nostream 2>&1 && echo "---ENV---" && ls /var/www/purple-port/server/ && cat /var/www/purple-port/server/.env | grep -v PASSWORD | grep -v SECRET | head -20`;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => { console.log('Code:', code); conn.end(); })
            .on('data', d => process.stdout.write(d))
            .stderr.on('data', d => process.stderr.write('ERR: ' + d));
    });
}).connect({ host: '66.116.224.221', port: 22, username: 'root', password: 'EzdanAdam@243' });
