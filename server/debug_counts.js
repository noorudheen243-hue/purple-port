const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Ensure we point to the correct DB if not in .env
process.env.DATABASE_URL = "file:" + path.join(__dirname, 'prisma', 'dev.db');

const prisma = new PrismaClient();

async function check() {
    try {
        const taskCount = await prisma.task.count();
        const tasksByDept = await prisma.task.groupBy({
            by: ['department'],
            _count: { _all: true }
        });

        const logs = {
            meta: await prisma.metaAdsLog.count(),
            google: await prisma.googleAdsLog.count(),
            seo: await prisma.seoLog.count(),
            web: await prisma.webDevProject.count(),
            content: await prisma.contentDeliverable.count()
        };

        console.log('--- DATABASE STATUS ---');
        console.log('Total Tasks:', taskCount);
        console.log('Tasks by Dept:', JSON.stringify(tasksByDept, null, 2));
        console.log('Log Counts:', JSON.stringify(logs, null, 2));

        const users = await prisma.user.groupBy({
            by: ['department'],
            _count: { _all: true }
        });
        console.log('Users by Dept:', JSON.stringify(users, null, 2));

    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

check();
