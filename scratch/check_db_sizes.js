const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('SSH connection established!');
    
    const cmd = `
        echo "=== ALL SQLite DB FILES IN /var/www ==="
        find /var/www -name "*.db" -exec ls -lh {} \\;
        
        echo "=== LEAD COUNTS FOR ALL DB FILES ==="
        find /var/www -name "*.db" -exec sh -c 'echo "DB: {}"; sqlite3 "{}" "select count(*) from Lead;" || echo "No Lead table"' \\;
    `;
    
    conn.exec(cmd, (err, stream) => {
        if (err) {
            console.error('Execution error:', err);
            conn.end();
            return;
        }
        stream.on('close', () => {
            conn.end();
            console.log('\nSSH connection closed.');
        });
        stream.on('data', (data) => {
            process.stdout.write(data.toString());
        });
        stream.stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });
    });
}).on('error', (err) => {
    console.error('Connection error:', err);
}).connect({ host: serverIp, port: 22, username, password });
