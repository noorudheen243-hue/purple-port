
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function diagnose() {
    console.log('\n--- LOGIN DIAGNOSTICS ---');
    console.log('Checking database connection...');

    // 1. List All Users
    const users = await prisma.user.findMany({
        select: { email: true, role: true, full_name: true }
    });
    console.log(`Total Users in DB: ${users.length}`);
    users.forEach(u => console.log(` - ${u.email} (${u.role})`));

    // 2. Check Admin
    const email = 'admin@qixads.com';
    console.log(`\nTesting specific user: ${email}...`);

    const admin = await prisma.user.findUnique({ where: { email } });

    if (!admin) {
        console.error('❌ CRITICAL: User admin@qixads.com NOT FOUND in database!');
    } else {
        console.log('✅ User found.');

        // 3. Test Password
        const testPass = 'password123';
        const isMatch = await bcrypt.compare(testPass, admin.password_hash);

        console.log(`Testing password '${testPass}' against DB hash...`);

        if (isMatch) {
            console.log('✅ MATCH CONFIRMED. The password IS "password123".');
            console.log('If you still cannot login, check if:');
            console.log('1. You are typing it correctly.');
            console.log('2. There are hidden spaces.');
            console.log('3. The frontend is hitting the correct API.');
        } else {
            console.error('❌ HASH MISMATCH. The stored password is NOT "password123".');

            console.log('>>> FORCE RESETTING PASSWORD NOW...');
            const salt = await bcrypt.genSalt(10);
            const newHash = await bcrypt.hash(testPass, salt);

            await prisma.user.update({
                where: { email },
                data: { password_hash: newHash }
            });
            console.log('✅ Password has been force-updated to "password123". Try logging in now.');
        }
    }
    console.log('--- END DIAGNOSTICS ---\n');
}

diagnose()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
