const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
    // Test API health and verify dist has server.js
    const cmd = [
        'ls /var/www/purple-port/server/dist/server.js && echo "server.js EXISTS"',
        'curl -s http://localhost:4001/api/auth/health 2>&1 || curl -s http://localhost:4001/api/health 2>&1 || echo "Testing /api..."',
        'curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/api/auth/login -X POST -H "Content-Type: application/json" -d \'{"email":"test","password":"test"}\''
    ].join(' && echo "---" && ');
    
    conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => { console.log('\nCode:', code); conn.end(); })
            .on('data', d => process.stdout.write(d))
            .stderr.on('data', d => process.stderr.write('ERR: ' + d));
    });
}).connect({ host: '66.116.224.221', port: 22, username: 'root', password: 'EzdanAdam@243' });
