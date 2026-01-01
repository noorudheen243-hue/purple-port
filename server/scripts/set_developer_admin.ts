
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'noorudheen243@gmail.com';

    console.log(`Searching for user: ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.error('User not found!');
        process.exit(1);
    }

    console.log(`Found user: ${user.full_name} (${user.role})`);
    console.log('Promoting to DEVELOPER_ADMIN...');

    await prisma.user.update({
        where: { email },
        data: { role: 'DEVELOPER_ADMIN' }
    });

    console.log('Success! User is now a Developer Admin.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
