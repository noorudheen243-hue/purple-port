const { Client } = require('ssh2');
const conn = new Client();
const serverIp = '66.116.224.221';
const username = 'root';
const password = 'EzdanAdam@243';

conn.on('ready', () => {
    console.log('SSH connection established!');
    
    const nodeScript = `
const fs = require('fs');
const path = require('path');

function searchFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
        const files = fs.readdirSync(filePath);
        for (const file of files) {
            searchFile(path.join(filePath, file));
        }
    } else if (filePath.endsWith('.js')) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('recordTime') || content.includes('getAttendances')) {
            console.log("Found in file:", filePath);
            // Print matching lines
            const lines = content.split('\\n');
            lines.forEach((line, idx) => {
                if (line.includes('recordTime') || line.includes('getAttendances') || line.includes('Date')) {
                    console.log("  Line " + (idx + 1) + ": " + line.trim());
                }
            });
        }
    }
}

searchFile('/var/www/purple-port/server/node_modules/zkteco-js');
`;

    const runCmd = `
        cat << 'EOF' > /tmp/search_zkteco.js
${nodeScript}
EOF
        node /tmp/search_zkteco.js
        rm -f /tmp/search_zkteco.js
    `;
    
    conn.exec(runCmd, (err, stream) => {
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
