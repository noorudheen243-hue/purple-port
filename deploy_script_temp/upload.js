const { NodeSSH } = require('node-ssh');
const path = require('path');

const ssh = new NodeSSH();

async function deploy() {
    try {
        console.log("Connecting to VPS...");
        await ssh.connect({
            host: '66.116.224.221',
            username: 'root',
            password: 'EzdanAdam@243'
        });

        console.log("Connected. Uploading dist.zip...");
        const localFile = 'f:\\\\Antigravity\\\\client\\\\dist.zip';
        const remoteFile = '/var/www/purple-port/dist.zip';
        await ssh.putFile(localFile, remoteFile);

        console.log("Upload complete. Executing deployment commands...");
        const commands = `
            mkdir -p /var/www/purple-port/server/public
            rm -rf /var/www/purple-port/server/public/*
            unzip -o /var/www/purple-port/dist.zip -d /var/www/purple-port/server/public
            rm /var/www/purple-port/dist.zip
            systemctl restart nginx
        `;

        const result = await ssh.execCommand(commands);
        if (result.stdout) console.log('STDOUT: ' + result.stdout);
        if (result.stderr) console.error('STDERR: ' + result.stderr);

        console.log("Deployment complete!");
        ssh.dispose();
    } catch (err) {
        console.error("Deployment Error:", err);
        ssh.dispose();
    }
}

deploy();
