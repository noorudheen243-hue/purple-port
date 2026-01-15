
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const client = await prisma.client.findFirst({
            where: { name: { contains: 'Koomen' } },
            select: { id: true, name: true, advance_balance: true }
        });
        console.log("Client Found:", client);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
