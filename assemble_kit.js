const fs = require('fs');
const path = require('path');

console.log("🏗️ Assembling Deployment Kit...");

const rootDir = __dirname;
const clientDir = path.join(rootDir, 'client');
const serverDir = path.join(rootDir, 'server');
const buildDir = path.join(rootDir, 'dist_production');

try {
    // 1. Clean previous build
    if (fs.existsSync(buildDir)) {
        console.log("Cleaning previous build...");
        fs.rmSync(buildDir, { recursive: true, force: true });
    }
    fs.mkdirSync(buildDir);
    fs.mkdirSync(path.join(buildDir, 'public'));

    // 2. Copy Server Build
    console.log("Copying Server...");
    if (!fs.existsSync(path.join(serverDir, 'dist'))) throw new Error("Server build missing! Run 'npm run build' in /server first.");
    fs.cpSync(path.join(serverDir, 'dist'), path.join(buildDir, 'dist'), { recursive: true });
    fs.copyFileSync(path.join(serverDir, 'package.json'), path.join(buildDir, 'package.json'));

    // 3. Copy Client Build
    console.log("Copying Client...");
    if (!fs.existsSync(path.join(clientDir, 'dist'))) throw new Error("Client build missing! Run 'npm run build' in /client first.");
    fs.cpSync(path.join(clientDir, 'dist'), path.join(buildDir, 'public'), { recursive: true });

    // 4. Copy Prisma
    console.log("Copying Database Config...");
    const prismaDir = path.join(buildDir, 'prisma');
    fs.mkdirSync(prismaDir);
    fs.copyFileSync(path.join(serverDir, 'prisma', 'schema.prisma'), path.join(prismaDir, 'schema.prisma'));

    console.log("\n✅ Deployment Kit Created at: " + buildDir);

} catch (error) {
    console.error("\n❌ Assembly Failed:", error.message);
    process.exit(1);
}
