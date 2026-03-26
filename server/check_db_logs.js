
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    console.log('--- Database Check ---');
    const metaCount = await prisma.metaAdsLog.count();
    const googleCount = await prisma.googleAdsLog.count();
    const seoCount = await prisma.seoLog.count();
    const webCount = await prisma.webDevProject.count();
    const contentCount = await prisma.contentDeliverable.count();
    const taskCount = await prisma.task.count();

    console.log(`MetaAdsLog: ${metaCount}`);
    console.log(`GoogleAdsLog: ${googleCount}`);
    console.log(`SeoLog: ${seoCount}`);
    console.log(`WebDevProject: ${webCount}`);
    console.log(`ContentDeliverable: ${contentCount}`);
    console.log(`Task: ${taskCount}`);

    // Check recent logs
    const recentMeta = await prisma.metaAdsLog.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    console.log('Recent Meta Log Dates:', recentMeta.map(l => l.createdAt));

    process.exit(0);
}

check();
