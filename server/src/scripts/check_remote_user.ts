
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'noorudheen243@gmail.com';
    console.log(`Checking for user: ${email}...`);

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (user) {
            console.log('✅ User FOUND in database.');
            console.log(`- ID: ${user.id}`);
            console.log(`- Role: ${user.role}`);
            console.log(`- Password Hash (first 20 chars): ${user.password_hash.substring(0, 20)}...`);
            console.log(`- Updated At: ${user.updatedAt}`);
        } else {
            console.log('❌ User NOT FOUND in database.');

            // List all users to see who IS there
            const allUsers = await prisma.user.findMany({
                select: { email: true, role: true }
            });
            console.log(`Total Users: ${allUsers.length}`);
            allUsers.forEach(u => console.log(`- ${u.email} (${u.role})`));
        }

    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
