const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    // Check for "too big header" error specifically
    conn.exec('grep "upstream sent too big header" /var/log/nginx/error.log | tail -n 5', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log('Finished with code', code);
            conn.end();
        }).on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
    });
}).connect({ host: '66.116.224.221', port: 22, username: 'root', password: 'EzdanAdam@243' });
