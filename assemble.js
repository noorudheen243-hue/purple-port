
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const clientDir = path.join(rootDir, 'client');
const serverDir = path.join(rootDir, 'server');
const buildDir = path.join(rootDir, 'dist_production');

try {
    if (fs.existsSync(buildDir)) {
        console.log("Cleaning...");
        fs.rmSync(buildDir, { recursive: true, force: true });
    }
    fs.mkdirSync(buildDir);
    fs.mkdirSync(path.join(buildDir, 'public'));

    // Server
    console.log("Copying Server...");
    if (fs.existsSync(path.join(serverDir, 'dist'))) {
        fs.cpSync(path.join(serverDir, 'dist'), path.join(buildDir, 'dist'), { recursive: true });
    } else {
        console.error("Server dist not found!");
    }
    fs.copyFileSync(path.join(serverDir, 'package.json'), path.join(buildDir, 'package.json'));

    // Client
    console.log("Copying Client...");
    if (fs.existsSync(path.join(clientDir, 'dist'))) {
        fs.cpSync(path.join(clientDir, 'dist'), path.join(buildDir, 'public'), { recursive: true });
    } else {
        console.error("Client dist not found!");
    }

    // Prisma
    console.log("Copying Prisma...");
    const prismaDir = path.join(buildDir, 'prisma');
    fs.mkdirSync(prismaDir);
    fs.copyFileSync(path.join(serverDir, 'prisma', 'schema.prisma'), path.join(prismaDir, 'schema.prisma'));

    // .env.production (server) - Creating a template or copying if exists
    // We'll create a template
    fs.writeFileSync(path.join(buildDir, '.env'), `PORT=4001\nDATABASE_URL="file:./prod.db"\nJWT_SECRET="changeme"\nCLIENT_URL="http://72.61.246.22,http://72.61.246.22:5173,http://localhost:5173"`);

    console.log("Zipping...");
    const archiver = require('./server/node_modules/archiver');
    const output = fs.createWriteStream(path.join(rootDir, 'deploy_package.zip'));
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', function () {
        console.log('Validating ZIP...');
        if (fs.existsSync(path.join(rootDir, 'deploy_package.zip'))) {
            console.log(archive.pointer() + ' total bytes');
            console.log('✅ deploy_package.zip created successfully');
        } else {
            console.error('❌ ZIP file creation failed');
        }
    });

    archive.pipe(output);
    archive.directory(buildDir, false);
    archive.finalize();

} catch (e) {
    console.error(e);
}
