
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAvatars() {
    try {
        console.log("Checking Users with avatars...");
        const users = await prisma.user.findMany({
            where: {
                avatar_url: { not: null }
            },
            select: {
                id: true,
                full_name: true,
                avatar_url: true
            },
            take: 10
        });

        if (users.length === 0) {
            console.log("No users found with avatars.");
        } else {
            console.log("First 10 users with avatars:");
            users.forEach(u => {
                console.log(`- ${u.full_name}: ${u.avatar_url}`);
            });
        }

        console.log("\nChecking Clients with logos...");
        const clients = await prisma.client.findMany({
            where: {
                logo_url: { not: null }
            },
            select: {
                id: true,
                name: true,
                logo_url: true
            },
            take: 10
        });

        if (clients.length === 0) {
            console.log("No clients found with logos.");
        } else {
            console.log("First 10 clients with logos:");
            clients.forEach(c => {
                console.log(`- ${c.name}: ${c.logo_url}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAvatars();
