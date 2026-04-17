
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const status = await prisma.biometricDeviceStatus.findFirst({ where: { id: 'CURRENT' } });
    console.log('--- Biometric Status ---');
    if (status) {
        console.log(`Status: ${status.status}`);
        console.log(`Last Heartbeat (Direct): ${status.last_heartbeat}`);
        console.log(`Last Bridge Heartbeat: ${status.last_bridge_heartbeat}`);
        console.log(`Last Office IP: ${status.last_office_ip}`);
    } else {
        console.log('No status found.');
    }

    const syncLogs = await prisma.biometricSyncLog.findMany({
        orderBy: { sync_time: 'desc' },
        take: 3
    });
    console.log('\n--- Recent Sync Logs ---');
    syncLogs.forEach(log => {
        console.log(`[${log.sync_time.toISOString()}] [${log.method}] ${log.status} - Fetched: ${log.logs_fetched}, Saved: ${log.logs_saved} ${log.error_msg ? '(' + log.error_msg + ')' : ''}`);
    });

    const lastRecords = await prisma.attendanceRecord.findMany({
        where: { method: 'BIOMETRIC' },
        orderBy: { date: 'desc' },
        take: 3,
        include: { user: { select: { full_name: true } } }
    });
    console.log('\n--- Recent Biometric Attendance Records ---');
    lastRecords.forEach(r => {
        console.log(`[${r.date.toISOString().split('T')[0]}] ${r.user?.full_name} - In: ${r.check_in?.toISOString() || '-'}, Out: ${r.check_out?.toISOString() || '-'}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
