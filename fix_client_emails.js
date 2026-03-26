/**
 * Script: fix_client_emails.js
 * Purpose: Normalize all CLIENT role user emails to lowercase in the local database.
 * Run with: node fix_client_emails.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixClientEmails() {
    console.log('[FIX] Finding all CLIENT role users...');

    const clientUsers = await prisma.user.findMany({
        where: { role: 'CLIENT' },
        select: { id: true, email: true, full_name: true }
    });

    console.log(`[FIX] Found ${clientUsers.length} client user(s).`);

    let fixed = 0;
    for (const u of clientUsers) {
        const normalized = u.email.trim().toLowerCase();
        if (normalized !== u.email) {
            console.log(`[FIX] Fixing email for "${u.full_name}": "${u.email}" -> "${normalized}"`);
            await prisma.user.update({
                where: { id: u.id },
                data: { email: normalized }
            });
            fixed++;
        } else {
            console.log(`[OK]  Email already normalized: "${u.email}"`);
        }
    }

    console.log(`\n[DONE] Fixed ${fixed} email(s).`);
    await prisma.$disconnect();
}

fixClientEmails().catch(async (e) => {
    console.error('[ERROR]', e);
    await prisma.$disconnect();
    process.exit(1);
});
