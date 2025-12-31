
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

function findFile(startPath, filter, maxDepth = 3, currentDepth = 0) {
    if (currentDepth > maxDepth) return [];
    if (!fs.existsSync(startPath)) return [];

    let results = [];
    const files = fs.readdirSync(startPath);
    for (const file of files) {
        const filename = path.join(startPath, file);
        const stat = fs.lstatSync(filename);
        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                results = results.concat(findFile(filename, filter, maxDepth, currentDepth + 1));
            }
        } else if (filename.indexOf(filter) >= 0) {
            results.push(filename);
        }
    }
    return results;
}

async function diagnose() {
    console.log('--- VPS DIAGNOSTIC TOOL ---');
    console.log('Current Directory:', process.cwd());
    console.log('User:', process.env.USER || 'unknown');

    // 1. Locate Database Files
    console.log('\nScanning for dev.db files...');
    const dbFiles = findFile(process.cwd(), 'dev.db');
    if (dbFiles.length === 0) {
        console.error('❌ CRITICAL: No dev.db file found by scanning!');
        return;
    }

    // 2. Try to open each
    for (const dbPath of dbFiles) {
        console.log(`\n------------------------------------------------`);
        console.log(`Checking Database: ${dbPath}`);

        try {
            // Check permissions
            const stat = fs.statSync(dbPath);
            console.log(`Permissions: Mode=${stat.mode}, Size=${stat.size} bytes`);

            // Connect
            const dbUrl = `file:${dbPath}`;
            const prisma = new PrismaClient({
                datasources: { db: { url: dbUrl } }
            });

            const userCount = await prisma.user.count();
            console.log(`✅ Connection Successful! Found ${userCount} users.`);

            if (userCount > 0) {
                const users = await prisma.user.findMany();
                console.log('Users in this DB:');
                for (const u of users) {
                    console.log(` - ${u.email} (Role: ${u.role})`);
                    console.log(`   Hash starts with: ${u.password_hash.substring(0, 10)}...`);

                    // Test Password
                    const isMatch = await bcrypt.compare('password123', u.password_hash);
                    console.log(`   Password 'password123' matches? ${isMatch ? 'YES ✅' : 'NO ❌'}`);

                    if (!isMatch && u.email === 'noorudheen243@gmail.com') {
                        console.log('   >>> ATTEMPTING FORCE RESET <<<');
                        const newHash = await bcrypt.hash('password123', 10);
                        await prisma.user.update({
                            where: { id: u.id },
                            data: { password_hash: newHash }
                        });
                        console.log('   >>> RESET COMPLETE ✅ <<<');
                    }
                }
            }
            await prisma.$disconnect();

        } catch (e) {
            console.error(`❌ Failed to access this DB: ${e.message}`);
        }
    }
}

diagnose();
