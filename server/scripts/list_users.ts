import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            full_name: true,
            email: true,
            role: true
        }
    });

    console.log('--- USER LIST ---');
    users.forEach(u => {
        console.log(`${u.id} | ${u.full_name} | ${u.email} | ${u.role}`);
    });
    console.log('-----------------');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
