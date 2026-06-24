const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('SSH Client ready');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        
        const localPath = 'f:\\Antigravity\\scratch\\sync_all_meta_leads.js';
        const remotePath = '/var/www/purple-port/server/scratch/sync_all_meta_leads.js';
        
        console.log('Uploading sync_all_meta_leads.js to VPS...');
        sftp.fastPut(localPath, remotePath, {}, (err) => {
            if (err) {
                console.error('Error uploading:', err);
                conn.end();
                return;
            }
            console.log('Upload complete. Executing script on VPS...');
            
            conn.exec('cd /var/www/purple-port/server && node scratch/sync_all_meta_leads.js', (err, stream) => {
                if (err) throw err;
                stream.on('close', () => {
                    console.log('\nExecution finished.');
                    conn.end();
                }).on('data', (data) => {
                    process.stdout.write(data.toString());
                }).stderr.on('data', (data) => {
                    process.stderr.write(data.toString());
                });
            });
        });
    });
}).connect({ host: serverIp, port: 22, username, password });
