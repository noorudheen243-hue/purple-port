
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
    console.log('--- UNIVERSAL RESET TOOL ---');
    console.log('CWD:', process.cwd());

    // 1. Find the DB
    const candidates = [
        path.join(process.cwd(), 'prisma', 'dev.db'),
        path.join(process.cwd(), 'dev.db'),
        path.join(__dirname, 'prisma', 'dev.db')
    ];

    let dbPath = null;
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            dbPath = p;
            break;
        }
    }

    if (!dbPath) {
        console.error('❌ CRITICAL ERROR: Could not find dev.db file!');
        console.log('Checked paths:', candidates);
        console.log('Listing current directory:', fs.readdirSync(process.cwd()));
        try {
            if (fs.existsSync(path.join(process.cwd(), 'prisma'))) {
                console.log('Listing prisma directory:', fs.readdirSync(path.join(process.cwd(), 'prisma')));
            }
        } catch (e) { console.log('Could not list prisma dir'); }
        return;
    }

    console.log(`✅ Database found at: ${dbPath}`);

    // 2. Connect with Absolute Path
    const dbUrl = `file:${dbPath}`;
    console.log(`Connecting to: ${dbUrl}`);

    const prisma = new PrismaClient({
        datasources: {
            db: { url: dbUrl }
        }
    });

    try {
        const EMAIL = "noorudheen243@gmail.com";
        console.log(`Resetting password for: ${EMAIL}`);

        const user = await prisma.user.findUnique({ where: { email: EMAIL } });
        if (!user) {
            console.error('❌ User not found in database.');

            // Debug: List all users?
            console.log('Listing 5 users from DB:');
            const users = await prisma.user.findMany({ take: 5 });
            users.forEach(u => console.log(' - ', u.email));
            return;
        }

        const hash = await bcrypt.hash("password123", 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { password_hash: hash }
        });

        console.log('✅ SUCCESS! Password reset to: password123');
    } catch (e) {
        console.error('❌ OPERATION FAILED:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
