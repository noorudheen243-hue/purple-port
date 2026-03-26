const { PrismaClient } = require('@prisma/client');
const path = require('path');
process.env.DATABASE_URL = "file:" + path.join(__dirname, 'prisma', 'dev.db');
const prisma = new PrismaClient();

async function migrate() {
    try {
        // 1. Update tasks to DIGITAL_MARKETING if they match keywords or have campaign/client links
        const result = await prisma.task.updateMany({
            where: {
                OR: [
                    { campaign_id: { not: null } },
                    { campaign_type: { not: null } },
                    { client_id: { not: null } },
                    { title: { contains: 'Meta' } },
                    { title: { contains: 'Google' } },
                    { title: { contains: 'SEO' } },
                    { type: { in: ['META_ADS', 'GOOGLE_ADS', 'SEO', 'WEB_DEVELOPMENT', 'CONTENT_PLANNING'] } }
                ],
                department: 'CREATIVE'
            },
            data: {
                department: 'DIGITAL_MARKETING'
            }
        });

        console.log(`Aggressive Migration: Updated ${result.count} tasks to DIGITAL_MARKETING.`);

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

migrate();
