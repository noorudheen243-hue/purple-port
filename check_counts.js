
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Counts ---');
    const users = await prisma.user.count();
    const clients = await prisma.client.count();
    const tasks = await prisma.task.count();
    const metaLogs = await prisma.metaAdsLog.count();
    const googleLogs = await prisma.googleAdsLog.count();
    const seoLogs = await prisma.seoLog.count();
    const webProjects = await prisma.webDevProject.count();

    console.log(`Users: ${users}`);
    console.log(`Clients: ${clients}`);
    console.log(`Tasks: ${tasks}`);
    console.log(`Meta Logs: ${metaLogs}`);
    console.log(`Google Logs: ${googleLogs}`);
    console.log(`SEO Logs: ${seoLogs}`);
    console.log(`Web Projects: ${webProjects}`);

    const creativeTasks = await prisma.task.count({ where: { department: 'CREATIVE' } });
    const dmTasks = await prisma.task.count({ where: { department: 'DIGITAL_MARKETING' } });

    console.log(`Creative Tasks: ${creativeTasks}`);
    console.log(`DM Tasks: ${dmTasks}`);

    const activeMetaLogs = await prisma.metaAdsLog.count({ where: { status: 'ACTIVE' } });
    console.log(`Active Meta Logs: ${activeMetaLogs}`);

    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
