
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTasks() {
    console.log('--- All Tasks (Count) ---');
    const count = await prisma.task.count();
    console.log('Total Tasks:', count);

    const someTasks = await prisma.task.findMany({ take: 10 });
    console.log('Sample Tasks:', JSON.stringify(someTasks, null, 2));

    console.log('\n--- MetaLogs (Count) ---');
    const mCount = await prisma.metaAdsLog.count();
    console.log('Total MetaLogs:', mCount);

    const someMeta = await prisma.metaAdsLog.findMany({ take: 10 });
    console.log('Sample MetaLogs:', JSON.stringify(someMeta, null, 2));

    await prisma.$disconnect();
}

checkTasks();
