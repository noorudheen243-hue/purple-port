
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function promoteUser() {
    const email = 'noorudheen243@gmail.com';
    const targetRole = 'DEVELOPER_ADMIN';

    console.log(`Searching for user: ${email}...`);

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            console.error(`User with email ${email} not found!`);
            return;
        }

        console.log(`Found user: ${user.full_name} (Current Role: ${user.role})`);

        if (user.role === targetRole) {
            console.log('User is already a Developer Admin.');
            return;
        }

        await prisma.user.update({
            where: { email },
            data: { role: targetRole }
        });

        console.log(`✅ Success! ${user.full_name} has been promoted to ${targetRole}.`);

    } catch (error) {
        console.error('Error upgrading user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

promoteUser();
