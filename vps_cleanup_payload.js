
const { PrismaClient } = require('/var/www/antigravity/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        console.log('Checking System Settings');
        
        const settings = await prisma.systemSetting.findMany({
            where: { key: { in: ['META_APP_ID', 'META_APP_SECRET'] } }
        });
        console.log('Settings:', JSON.stringify(settings, null, 2));

    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}
run();
