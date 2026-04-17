const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const token = await prisma.metaToken.findUnique({
        where: { id: 'token-919640203803366-0f602110-d76e-4f21-8bcf-c71959dd4015' }
    });
    console.log('Token Record:', JSON.stringify(token, null, 2));
    process.exit(0);
}

check();
