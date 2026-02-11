
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'noorudheen243@gmail.com';
    const passwordRaw = 'password123';

    console.log(`Creating/Updating Developer Admin: ${email}...`);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordRaw, salt);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            role: 'DEVELOPER_ADMIN',
            password_hash: passwordHash,
            department: 'MANAGEMENT'
        },
        create: {
            email,
            full_name: 'Noorudheen (Dev Admin)',
            password_hash: passwordHash,
            role: 'DEVELOPER_ADMIN',
            department: 'MANAGEMENT'
        }
    });

    console.log(`User ${user.email} created/updated successfully.`);
    console.log(`Role: ${user.role}`);
    console.log(`Password set to: ${passwordRaw}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
