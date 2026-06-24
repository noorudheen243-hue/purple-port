const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const records = await prisma.attendanceRecord.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5
    });
    console.log("Latest All Records:");
    records.forEach(r => {
        console.log(`User: ${r.user_id}, Date: ${r.date.toISOString()}, In: ${r.check_in?.toISOString()}, Out: ${r.check_out?.toISOString()}, Method: ${r.method}, Updated: ${r.updatedAt.toISOString()}`);
    });
    
    // Also fetch the sync logs with errors
    const syncLogs = await prisma.biometricSyncLog.findMany({
        orderBy: { sync_time: 'desc' },
        take: 1
    });
    console.log("\nLatest Sync Log Details:");
    if (syncLogs.length > 0) {
        console.log(JSON.stringify(syncLogs[0], null, 2));
    }
}
check().then(() => prisma.$disconnect());
