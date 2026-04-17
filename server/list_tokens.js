const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const tokens = await prisma.metaToken.findMany();
    console.log('Available Tokens:');
    tokens.forEach(t => console.log(`- ${t.account_name} (${t.id})`));
    process.exit(0);
}

check();
