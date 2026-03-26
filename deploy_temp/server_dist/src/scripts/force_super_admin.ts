
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'noorudheen243@gmail.com';
    console.log(`Checking user: ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.error("User not found!");
        return;
    }

    console.log(`Current Role: ${user.role}`);

    if (user.role !== 'DEVELOPER_ADMIN') {
        console.log("Updating to DEVELOPER_ADMIN...");
        await prisma.user.update({
            where: { email },
            data: { role: 'DEVELOPER_ADMIN' }
        });
        console.log("Success! Role updated.");
    } else {
        console.log("User is already DEVELOPER_ADMIN.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
