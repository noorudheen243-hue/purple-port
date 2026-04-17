const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    // 1. Update .env to include NODE_ENV=production
    // 2. Update Nginx to include proxy buffer settings
    const nginxFix = `
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;
    `;
    
    const cmd = `
    # Update .env
    grep -q "NODE_ENV" /var/www/purple-port/server/.env || echo "NODE_ENV=production" >> /var/www/purple-port/server/.env
    
    # Update Nginx config (inserting before the first proxy_pass in the api location)
    # We'll just append it to the location /api block for simplicity if we can find it
    sed -i '/location \\/api {/a \\        proxy_buffer_size 128k;\\n        proxy_buffers 4 256k;\\n        proxy_busy_buffers_size 256k;' /etc/nginx/sites-enabled/default
    
    # Test and reload
    nginx -t && systemctl reload nginx
    pm2 restart qix-ads-v2.7
    `;
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
            console.log('Update finished with code', code);
            conn.end();
        }).on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
    });
}).connect({ host: '66.116.224.221', port: 22, username: 'root', password: 'EzdanAdam@243' });
