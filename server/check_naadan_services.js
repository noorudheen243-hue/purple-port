const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const client = await prisma.client.findUnique({
        where: { id: '1dca8a40-5cf5-4b66-b256-0e5e2c1d6cae' }
    });
    console.log(`Client: ${client.name}, Services: ${client.service_engagement}`);
    process.exit(0);
}

check();
