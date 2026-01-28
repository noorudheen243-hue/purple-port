import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'noorudheen243@gmail.com';
    const password = 'password123';

    console.log(`🌱 Seeding local database for ${email}...`);

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password_hash: hash,
            role: 'ADMIN',
            department: 'MANAGEMENT'
        },
        create: {
            email,
            full_name: 'Noorudheen Local',
            password_hash: hash,
            role: 'ADMIN',
            department: 'MANAGEMENT'
        }
    });

    await prisma.staffProfile.upsert({
        where: { user_id: user.id },
        update: {},
        create: {
            user_id: user.id,
            staff_number: 'QIX-001',
            designation: 'Founder',
            department: 'MANAGEMENT',
            date_of_joining: new Date(),
        }
    });

    console.log('✅ Local Admin Created/Updated!');
    console.log(`👉 Login with: ${email} / ${password}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
