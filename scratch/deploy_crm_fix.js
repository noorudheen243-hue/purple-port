const { Client } = require('ssh2');
const fs = require('fs');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('SSH Client ready');
    conn.sftp((err, sftp) => {
        if (err) throw err;
        
        const localSrc = 'f:\\Antigravity\\server\\src\\modules\\marketing-tasks\\crm.controller.ts';
        const remoteSrc = '/var/www/purple-port/server/src/modules/marketing-tasks/crm.controller.ts';
        
        const localDist = 'f:\\Antigravity\\server\\dist\\modules\\marketing-tasks\\crm.controller.js';
        const remoteDist = '/var/www/purple-port/server/dist/modules/marketing-tasks/crm.controller.js';
        
        const localMap = 'f:\\Antigravity\\server\\dist\\modules\\marketing-tasks\\crm.controller.js.map';
        const remoteMap = '/var/www/purple-port/server/dist/modules/marketing-tasks/crm.controller.js.map';
        
        console.log('Uploading crm.controller.ts...');
        sftp.fastPut(localSrc, remoteSrc, {}, (err) => {
            if (err) {
                console.error('Error uploading src:', err);
                conn.end();
                return;
            }
            console.log('crm.controller.ts uploaded successfully!');
            
            console.log('Uploading crm.controller.js...');
            sftp.fastPut(localDist, remoteDist, {}, (err) => {
                if (err) {
                    console.error('Error uploading dist:', err);
                    conn.end();
                    return;
                }
                console.log('crm.controller.js uploaded successfully!');
                
                // Upload map file if it exists locally
                if (fs.existsSync(localMap)) {
                    console.log('Uploading crm.controller.js.map...');
                    sftp.fastPut(localMap, remoteMap, {}, (err) => {
                        if (err) {
                            console.warn('Warning: Error uploading map:', err);
                        } else {
                            console.log('crm.controller.js.map uploaded successfully!');
                        }
                        restartPm2();
                    });
                } else {
                    restartPm2();
                }
            });
        });
    });

    function restartPm2() {
        console.log('Restarting qix-api via PM2...');
        conn.exec('pm2 restart qix-api', (err, stream) => {
            if (err) {
                console.error('Error executing PM2 restart:', err);
                conn.end();
                return;
            }
            stream.on('close', () => {
                console.log('PM2 restarted successfully!');
                conn.end();
            }).on('data', (data) => {
                process.stdout.write(data.toString());
            });
        });
    }
}).connect({ host: serverIp, port: 22, username, password });
