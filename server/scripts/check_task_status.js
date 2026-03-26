
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const tasks = await prisma.task.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, status: true }
    });
    console.log(JSON.stringify(tasks, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
