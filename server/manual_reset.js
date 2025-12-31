
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const EMAIL = "noorudheen243@gmail.com";
const NEW_PASSWORD = "password123";

async function main() {
    console.log('--- MANUAL PASSWORD RESET TOOL ---');
    console.log(`Target Email: ${EMAIL}`);

    try {
        const user = await prisma.user.findUnique({
            where: { email: EMAIL },
        });

        if (!user) {
            console.error('❌ User NOT found. Check the email address.');
            process.exit(1);
        }

        console.log(`✅ User found: ${user.full_name} (${user.role})`);
        console.log('Generating hash...');

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(NEW_PASSWORD, salt);

        console.log('Updating database...');
        await prisma.user.update({
            where: { id: user.id },
            data: { password_hash: hash },
        });

        console.log('--------------------------------------------------');
        console.log(`✅ PASSWORD SUCCESSFULLY RESET TO: ${NEW_PASSWORD}`);
        console.log('--------------------------------------------------');

    } catch (e) {
        console.error('❌ ERROR:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
