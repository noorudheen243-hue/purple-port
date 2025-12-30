
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAdmins() {
    try {
        const admins = await prisma.user.findMany({
            where: {
                role: 'ADMIN'
            },
            select: {
                id: true,
                full_name: true,
                email: true,
                department: true,
                role: true,
                createdAt: true
            }
        });

        console.log('--- ADMIN USERS ---');
        if (admins.length === 0) {
            console.log('No admin users found.');
        } else {
            console.table(admins);
        }
        console.log(`Total Admins: ${admins.length}`);

    } catch (error) {
        console.error('Error fetching admins:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listAdmins();
