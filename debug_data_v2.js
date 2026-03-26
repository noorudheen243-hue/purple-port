
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    console.log('--- Task Departments ---');
    const taskDepts = await prisma.task.groupBy({
        by: ['department'],
        _count: { id: true }
    });
    console.log(JSON.stringify(taskDepts, null, 2));

    console.log('\n--- Recent Creative Tasks ---');
    const creativeTasks = await prisma.task.findMany({
        where: { department: 'CREATIVE' },
        take: 5,
        select: { id: true, title: true, status: true, department: true, created_at: true, due_date: true }
    });
    console.log(JSON.stringify(creativeTasks, null, 2));

    console.log('\n--- User Departments ---');
    const userDepts = await prisma.user.groupBy({
        by: ['department'],
        _count: { id: true }
    });
    console.log(JSON.stringify(userDepts, null, 2));

    console.log('\n--- Recent Activity Logs (MetaAdsLog) ---');
    const metaLogs = await prisma.metaAdsLog.findMany({
        take: 5,
        select: { id: true, user_id: true, campaign_name: true, createdAt: true }
    });
    console.log(JSON.stringify(metaLogs, null, 2));

    await prisma.$disconnect();
}

checkData();
