const { NodeSSH } = require('node-ssh');
const path = require('path');

const ssh = new NodeSSH();

async function deploy() {
    console.log('[1/4] Connecting to VPS...');
    await ssh.connect({
        host: '82.180.146.4',
        username: 'root',
        password: 'EzdanAdam@243',
        readyTimeout: 20000,
    });
    console.log('[1/4] ✅ Connected');

    console.log('[2/4] Uploading server_wa_fix.zip...');
    await ssh.putFile(
        path.resolve(__dirname, '../server_wa_fix.zip'),
        '/tmp/server_wa_fix.zip'
    );
    console.log('[2/4] ✅ Upload complete');

    console.log('[3/4] Extracting and replacing dist on VPS...');
    const result = await ssh.execCommand(`
        cd /var/www/purple-port/server &&
        rm -rf dist_backup &&
        cp -r dist dist_backup &&
        cd /tmp &&
        unzip -o server_wa_fix.zip -d /var/www/purple-port/server/dist &&
        echo "EXTRACT_OK"
    `);
    console.log('Extract stdout:', result.stdout);
    if (result.stderr) console.log('Extract stderr:', result.stderr);

    if (!result.stdout.includes('EXTRACT_OK')) {
        throw new Error('Extraction may have failed — check stderr above');
    }

    console.log('[4/4] Restarting PM2...');
    const pm2Result = await ssh.execCommand('pm2 restart qix-api --update-env && pm2 save && echo "PM2_OK"');
    console.log('PM2 stdout:', pm2Result.stdout);
    if (pm2Result.stderr) console.log('PM2 stderr:', pm2Result.stderr);

    if (pm2Result.stdout.includes('PM2_OK')) {
        console.log('\n✅ DEPLOY COMPLETE — WA Dispatch Test fix is live!');
    } else {
        console.log('\n⚠️  PM2 restart may have issues. Check manually.');
    }

    ssh.dispose();
}

deploy().catch(err => {
    console.error('Deploy failed:', err.message);
    ssh.dispose();
    process.exit(1);
});
