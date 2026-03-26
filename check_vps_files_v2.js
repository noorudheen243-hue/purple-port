
const { Client } = require('ssh2');

const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('Client :: ready');
    const cmd = `
        echo "--- Root of Project ---"
        ls -F /var/www/purple-port
        echo "--- Server Folder ---"
        ls -F /var/www/purple-port/server
        echo "--- Server Dist Folder ---"
        ls -F /var/www/purple-port/server/dist
        echo "--- Server Public Folder ---"
        ls -F /var/www/purple-port/server/public
        echo "--- Updated Files Temp Area ---"
        ls -F /var/www/purple-port/updated_files
        ls -F /var/www/purple-port/updated_files/server_dist
    `;
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
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
