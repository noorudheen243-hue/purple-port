
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function checkSyncStats() {
    console.log("--- Sync Log Audit ---\n");

    const logs = await db.biometricSyncLog.findMany({
        take: 10,
        orderBy: { sync_time: 'desc' }
    });

    console.log("Last 10 Syncs:");
    logs.forEach(l => {
        console.log(`[${l.sync_time.toISOString()}] Status: ${l.status}, Fetched: ${l.logs_fetched}, Saved: ${l.logs_saved}, Error: ${l.error_msg || 'None'}`);
    });

    // Check for any specific errors about UID 13
    const errors = await db.biometricSyncLog.findMany({
        where: { error_msg: { contains: '13' } },
        take: 5
    });

    if (errors.length > 0) {
        console.log("\nFound errors related to '13':");
        errors.forEach(e => console.log(`- ${e.error_msg}`));
    } else {
        console.log("\nNo explicit errors mentioning '13' found in the main logs table.");
    }
}

checkSyncStats()
    .catch(console.error)
    .finally(() => db.$disconnect());
