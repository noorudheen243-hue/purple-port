
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    console.log('--- Current Date/Time ---');
    console.log(new Date().toLocaleString());

    console.log('\n--- User Departments ---');
    const uDepts = await prisma.user.groupBy({ by: ['department'], _count: { id: true } });
    console.log(uDepts);

    console.log('\n--- Task Departments & Counts ---');
    const tDepts = await prisma.task.groupBy({ by: ['department'], _count: { id: true } });
    console.log(tDepts);

    console.log('\n--- Tasks for March 05 2026 ---');
    const start = new Date(2026, 2, 5, 0, 0, 0); // March starts at 0 index
    const end = new Date(2026, 2, 5, 23, 59, 59);
    console.log(`Searching between ${start.toISOString()} and ${end.toISOString()}`);

    const march5Tasks = await prisma.task.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { id: true, title: true, department: true, createdAt: true }
    });
    console.log('Tasks on March 05:', march5Tasks.length);
    console.log(march5Tasks);

    const march5Meta = await prisma.metaAdsLog.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { id: true, campaign_name: true, createdAt: true }
    });
    console.log('Meta Logs on March 05:', march5Meta.length);
    console.log(march5Meta);

    const creativeTasks = await prisma.task.findMany({
        where: { department: 'CREATIVE' },
        take: 5
    });
    console.log('\n--- Sample Creative Tasks ---');
    console.log(creativeTasks);

    await prisma.$disconnect();
}

checkData();
