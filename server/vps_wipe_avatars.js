#!/usr/bin/env node
// Script to wipe all profile images from VPS database and uploads folder
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Find Prisma client
let prisma;
try {
    const { PrismaClient } = require('/var/www/purple-port/server/node_modules/.prisma/client');
    prisma = new PrismaClient({
        datasources: {
            db: {
                url: 'file:/var/www/purple-port/server/data/dev.db'
            }
        }
    });
} catch (e) {
    // Try alternate paths
    const { PrismaClient } = require('/var/www/purple-port/server/node_modules/@prisma/client');
    prisma = new PrismaClient();
}

async function main() {
    console.log('Clearing avatar_url from User table...');
    const users = await prisma.user.updateMany({ data: { avatar_url: null } });
    console.log('Users cleared:', users.count);

    console.log('Clearing logo_url from Client table...');
    try {
        const clients = await prisma.client.updateMany({ data: { logo_url: null } });
        console.log('Clients cleared:', clients.count);
    } catch (e) {
        console.log('Client logo clear error (may be fine):', e.message);
    }

    // Delete files from uploads directory
    const uploadDirs = [
        '/var/www/purple-port/server/uploads',
        '/var/www/antigravity/server/uploads'
    ];

    for (const dir of uploadDirs) {
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            let count = 0;
            for (const file of files) {
                const fp = path.join(dir, file);
                if (fs.statSync(fp).isFile()) {
                    fs.unlinkSync(fp);
                    count++;
                }
            }
            console.log('Deleted', count, 'files from', dir);
        }
    }

    console.log('Done!');
    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
