import { Client } from 'ssh2';
import fs from 'fs';

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const localPath = 'f:/Antigravity/client/src/pages/marketing/MarketingIntegrations.tsx';
    const remotePath = '/var/www/qix-ads/client/src/pages/marketing/MarketingIntegrations.tsx';
    
    sftp.fastPut(localPath, remotePath, (err) => {
      if (err) throw err;
      console.log('File transferred successfully');
      
      // Now run build commands
      conn.exec('cd /var/www/qix-ads/client && npm run build && pm2 restart all', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
          console.log('Build Stream :: close :: code: ' + code + ', signal: ' + signal);
          conn.end();
        }).on('data', (data) => {
          console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
          console.error('STDERR: ' + data);
        });
      });
    });
  });
}).connect({
  host: '157.173.123.111',
  port: 22,
  username: 'root',
  password: 'K@rthik79'
});
