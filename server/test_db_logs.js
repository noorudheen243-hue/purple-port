const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const records = await prisma.attendanceRecord.findMany({
        where: { method: 'BIOMETRIC' },
        orderBy: { updatedAt: 'desc' },
        take: 5
    });
    console.log("Latest Biometric Records:");
    records.forEach(r => {
        console.log(`User: ${r.user_id}, Date: ${r.date.toISOString()}, In: ${r.check_in?.toISOString()}, Out: ${r.check_out?.toISOString()}, Updated: ${r.updatedAt.toISOString()}`);
    });
    
    // Also fetch the sync logs
    const syncLogs = await prisma.biometricSyncLog.findMany({
        orderBy: { sync_time: 'desc' },
        take: 3
    });
    console.log("\nLatest Sync Logs:");
    syncLogs.forEach(l => {
        console.log(`Time: ${l.sync_time.toISOString()}, Method: ${l.method}, Status: ${l.status}, Fetched: ${l.logs_fetched}, Saved: ${l.logs_saved}`);
    });
}
check().then(() => prisma.$disconnect());
