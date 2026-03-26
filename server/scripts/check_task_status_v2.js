
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const counts = await prisma.task.groupBy({
        by: ['status'],
        _count: {
            _all: true
        }
    });
    console.log('Status Counts:', JSON.stringify(counts, null, 2));

    const sample = await prisma.task.findMany({
        take: 5,
        select: { id: true, status: true }
    });
    console.log('Sample Tasks:', JSON.stringify(sample, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
