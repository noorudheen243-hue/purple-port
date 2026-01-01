
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            email: true,
            full_name: true,
            role: true,
        },
    });

    console.log('--- AVAILABLE USERS ---');
    users.forEach(u => {
        console.log(`Email: ${u.email} | Name: ${u.full_name} | Role: ${u.role}`);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
