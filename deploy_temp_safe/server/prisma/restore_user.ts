import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Restoring admin user...');
    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('password123', salt);

    await prisma.user.upsert({
        where: { email: 'noorudheen243@gmail.com' },
        update: { password_hash: password },
        create: {
            email: 'noorudheen243@gmail.com',
            full_name: 'Noorudheen',
            password_hash: password,
            role: 'DEVELOPER_ADMIN',
            department: 'MANAGEMENT',
        },
    });

    console.log('User restored successfully.');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
