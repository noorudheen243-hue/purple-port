const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    const dbPaths = [
        '/var/www/purple-port/server/prisma/dev.db',
        '/var/www/antigravity/server/prisma/dev.db'
    ];

    // Use sqlite3 command line tool to check users
    const cmds = dbPaths.map(p => `echo "--- ${p} ---"; sqlite3 ${p} "SELECT count(*) FROM User;" || echo "Error"`).join('; ');

    conn.exec(cmds, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
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
