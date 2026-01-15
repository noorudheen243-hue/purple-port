import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLinks() {
    console.log('Checking Client <-> User Links...');

    // 1. Get our Test Client
    const client = await prisma.client.findFirst({ where: { name: "Naadan Food Stuff" } });
    if (!client) {
        console.log('Client "Naadan Food Stuff" not found!');
        return;
    }
    console.log(`Client Found: ${client.name} (${client.id})`);

    // 2. Find User linked to this Client
    const linkedUser = await prisma.user.findFirst({
        where: { linked_client_id: client.id }
    });

    if (linkedUser) {
        console.log(`SUCCESS: Linked User Found -> ${linkedUser.full_name} (${linkedUser.email})`);
        console.log(`Login as this user to see transactions.`);
        console.log(`Password Hash: ${linkedUser.password_hash.substring(0, 10)}...`); // Just to confirm existence
    } else {
        console.log(`FAILURE: No user is linked to this Client ID.`);
        console.log(`You need to assign a User to this Client to view the dashboard.`);

        // Suggest fixing it?
        const possibleUser = await prisma.user.findFirst({ where: { email: { contains: 'naadan' } } });
        if (possibleUser) {
            console.log(`Potential Match: found user with email ${possibleUser.email}. Should we link them?`);
        }
    }
}

checkLinks()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
