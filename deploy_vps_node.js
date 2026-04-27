const { NodeSSH } = require('node-ssh');
const path = require('path');
const ssh = new NodeSSH();

const config = {
    host: '66.116.224.221',
    username: 'root',
    password: 'EzdanAdam@243'
};

async function deploy() {
    try {
        console.log('🚀 Connecting to VPS...');
        await ssh.connect(config);
        console.log('✅ Connected.');

        const localZip = path.join(__dirname, 'deploy_package.zip');
        const remoteZip = '/root/deploy_package.zip';
        const remotePath = '/var/www/purple-port';

        console.log('📤 Uploading package...');
        await ssh.putFile(localZip, remoteZip);
        console.log('✅ Uploaded.');

        console.log('🛠️ Running remote deployment commands...');
        const commands = [
            `mkdir -p ${remotePath}/updated_files`,
            `rm -rf ${remotePath}/updated_files/*`,
            `unzip -o ${remoteZip} -d ${remotePath}/updated_files/`,
            `rm ${remoteZip}`,
            `echo "-> Updating Frontend..."`,
            `mkdir -p ${remotePath}/client/dist`,
            `rm -rf ${remotePath}/client/dist/*`,
            `cp -r ${remotePath}/updated_files/client_dist/* ${remotePath}/client/dist/`,
            `echo "-> Updating Backend & Data..."`,
            `mkdir -p ${remotePath}/server/dist`,
            `rm -rf ${remotePath}/server/dist/*`,
            `cp -r ${remotePath}/updated_files/server_dist/* ${remotePath}/server/dist/`,
            `if [ -d ${remotePath}/updated_files/server_dist/src ]; then cp -r ${remotePath}/updated_files/server_dist/src/* ${remotePath}/server/src/; fi`,
            `if [ -d ${remotePath}/updated_files/server_dist/scripts ]; then cp -r ${remotePath}/updated_files/server_dist/scripts/* ${remotePath}/server/scripts/; fi`,
            `if [ -d ${remotePath}/updated_files/server_dist/prisma ]; then cp ${remotePath}/updated_files/server_dist/prisma/schema.prisma ${remotePath}/server/prisma/; fi`,
            `cp ${remotePath}/updated_files/server_dist/package.json ${remotePath}/server/`,
            `echo "-> Applying Database Schema Changes..."`,
            `cd ${remotePath}/server && npx prisma db push --accept-data-loss`,
            `echo "-> Restarting PM2..."`,
            `pm2 restart qix-ads-v2.7 || pm2 start dist/server.js --name qix-ads-v2.7`,
            `echo "-> Cleaning up..."`,
            `rm -rf ${remotePath}/updated_files`
        ];

        for (const cmd of commands) {
            console.log(`Running: ${cmd}`);
            const result = await ssh.execCommand(cmd);
            if (result.stdout) console.log(result.stdout);
            if (result.stderr) console.error(result.stderr);
        }

        console.log('✅ Deployment complete!');
        ssh.dispose();
    } catch (err) {
        console.error('❌ Deployment failed:', err);
        process.exit(1);
    }
}

deploy();
