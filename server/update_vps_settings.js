const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    const dbPath = '/var/www/purple-port/server/prisma/dev.db';
    const appId = '1435036591194008';
    const appSecret = '8323e15731f813e88917490ea1ca9c0f';
    
    // Construct SQL to update both keys
    const sql = `UPDATE SystemSetting SET value = CASE key WHEN 'META_APP_ID' THEN '${appId}' WHEN 'META_APP_SECRET' THEN '${appSecret}' END WHERE key IN ('META_APP_ID', 'META_APP_SECRET');`;
    
    const command = `sqlite3 ${dbPath} "${sql}"`;
    console.log('Running command:', command);

    conn.exec(command, (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => {
            console.log('Output:', data.toString());
        }).stderr.on('data', (data) => {
            console.error('Error:', data.toString());
        }).on('close', (code, signal) => {
            console.log('Command closed with code:', code);
            conn.end();
        });
    });
}).connect({
    host: serverIp,
    port: 22,
    username: username,
    password: password
});
