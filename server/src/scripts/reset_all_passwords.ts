
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAll() {
    console.log('>>> RESETTING ALL PASSWORDS...');

    // 1. Generate Hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // 2. Update All Users
    const result = await prisma.user.updateMany({
        data: {
            password_hash: hashedPassword
        }
    });

    console.log(`>>> SUCCESS! Updated ${result.count} users.`);
    console.log('>>> All passwords are now: password123');
}

resetAll()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
