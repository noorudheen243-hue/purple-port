const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("🚀 Starting Production Build Process...");

const rootDir = path.join(__dirname, '..');
const clientDir = path.join(rootDir, 'client');
const serverDir = path.join(rootDir, 'server');
const buildDir = path.join(rootDir, 'dist_production');

// Helper to run commands
const run = (cmd, cwd) => {
    console.log(`> ${cmd}`);
    execSync(cmd, { cwd, stdio: 'inherit' });
};

try {
    // 1. Clean previous build
    if (fs.existsSync(buildDir)) {
        console.log("Cleaning previous build...");
        fs.rmSync(buildDir, { recursive: true, force: true });
    }
    fs.mkdirSync(buildDir);
    fs.mkdirSync(path.join(buildDir, 'public'));

    // 2. Build Client
    console.log("\n📦 Building Client...");
    run('npm install', clientDir);
    run('npm run build', clientDir);

    // 3. Build Server
    console.log("\n⚙️ Building Server...");
    run('npm install', serverDir);
    run('npm run build', serverDir);

    // 4. Assemble Artifacts
    console.log("\n🏗️ Assembling Artifacts...");

    // Copy Server Build
    // We only need the 'dist' folder, package.json, and .env usually
    // But for simplicity we copy server dist contents to root of build
    fs.cpSync(path.join(serverDir, 'dist'), path.join(buildDir, 'dist'), { recursive: true });
    fs.copyFileSync(path.join(serverDir, 'package.json'), path.join(buildDir, 'package.json'));
    // fs.copyFileSync(path.join(serverDir, '.env'), path.join(buildDir, '.env')); // User must supply proper .env

    // Copy Client Build to server's 'public' folder (as defined in app.ts)
    fs.cpSync(path.join(clientDir, 'dist'), path.join(buildDir, 'public'), { recursive: true });

    // Copy Prisma
    const prismaDir = path.join(buildDir, 'prisma');
    fs.mkdirSync(prismaDir);
    fs.copyFileSync(path.join(serverDir, 'prisma', 'schema.prisma'), path.join(prismaDir, 'schema.prisma'));

    console.log("\n✅ Build Complete!");
    console.log(`📂 Output Directory: ${buildDir}`);
    console.log("\nNext Steps for Deployment:");
    console.log("1. Upload contents of 'dist_production' to your server.");
    console.log("2. Run 'npm install --production' on the server.");
    console.log("3. Create a .env file with production variables.");
    console.log("4. Run 'npx prisma db push' to set up the database.");
    console.log("5. Start the server (e.g., 'node dist/server.js').");

} catch (error) {
    console.error("\n❌ Build Failed:", error.message);
    process.exit(1);
}
