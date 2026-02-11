
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            // Removed erroneous 'where' clause for deleted_at
            select: {
                id: true,
                email: true,
                full_name: true,
                role: true,
                department: true, // Use department instead of designation/status
            },
            orderBy: {
                role: 'asc',
            },
        });

        console.log('------------------------------------------------------------------------------------------------');
        console.log('| Role             | Name                 | Email                          | Department     |');
        console.log('------------------------------------------------------------------------------------------------');

        users.forEach(user => {
            console.log(`| ${user.role.padEnd(16)} | ${user.full_name.padEnd(20)} | ${user.email.padEnd(30)} | ${user.department.padEnd(14)} |`);
        });

        console.log('------------------------------------------------------------------------------------------------');
        console.log(`Total Users: ${users.length}`);

    } catch (error) {
        console.error('Error fetching users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
