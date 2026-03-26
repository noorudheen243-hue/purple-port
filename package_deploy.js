
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const packageDir = 'deploy_temp';
const zipFile = 'deploy_restored.tar.gz';

console.log('--- Creating Deployment Package ---');

try {
    // 1. Cleanup
    if (fs.existsSync(packageDir)) {
        fs.rmSync(packageDir, { recursive: true, force: true });
    }
    if (fs.existsSync(zipFile)) {
        fs.unlinkSync(zipFile);
    }

    // 2. Setup Structure
    fs.mkdirSync(path.join(packageDir, 'client_dist'), { recursive: true });
    // IMPORTANT: server_dist contents are copied directly into server/dist on VPS
    // So we don't need an extra 'dist' level here.
    fs.mkdirSync(path.join(packageDir, 'server_dist/modules'), { recursive: true });
    fs.mkdirSync(path.join(packageDir, 'server_dist/src'), { recursive: true });
    fs.mkdirSync(path.join(packageDir, 'server_dist/prisma'), { recursive: true });

    // 3. Copy Files
    console.log('Copying Client dist...');
    fs.cpSync('client/dist', path.join(packageDir, 'client_dist'), { recursive: true });

    console.log('Copying Server dist contents...');
    // Copy contents of server/dist directly to server_dist
    fs.cpSync('server/dist', path.join(packageDir, 'server_dist'), { recursive: true });

    console.log('Copying Server src...');
    fs.cpSync('server/src', path.join(packageDir, 'server_dist/src'), { recursive: true });

    console.log('Copying Prisma schema...');
    fs.copyFileSync('server/prisma/schema.prisma', path.join(packageDir, 'server_dist/prisma/schema.prisma'));

    console.log('Copying package.json...');
    fs.copyFileSync('server/package.json', path.join(packageDir, 'server_dist/package.json'));

    // 4. Create Tarball
    console.log('Creating tar.gz...');
    execSync(`tar -czf ${zipFile} -C ${packageDir} .`);

    // 5. Cleanup
    fs.rmSync(packageDir, { recursive: true, force: true });

    console.log(`Successfully created ${zipFile}`);
} catch (error) {
    console.error('Packaging failed:', error);
    process.exit(1);
}
