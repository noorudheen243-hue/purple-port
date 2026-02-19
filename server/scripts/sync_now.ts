/**
 * Quick one-shot sync: pull today's logs from device and inject into DB.
 * Run: npx ts-node scripts/sync_now.ts
 */
// @ts-ignore
import ZKLib from 'zkteco-js';
import { AttendanceService } from '../src/modules/attendance/service';
import prisma from '../src/utils/prisma';

const DEVICE_IP = '192.168.1.201';
const DEVICE_PORT = 4370;

async function main() {
    console.log('[SyncNow] Connecting to device...');
    const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 4000);

    try {
        await (zk as any).ztcp.createSocket();
        await (zk as any).ztcp.connect();
        (zk as any).connectionType = 'tcp';
        console.log('[SyncNow] Connected!');

        const logsResp: any = await Promise.race([
            zk.getAttendances(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), 20000))
        ]);

        const allLogs: any[] = logsResp?.data || [];
        console.log(`[SyncNow] Total logs on device: ${allLogs.length}`);

        // Filter to today only
        const todayStr = new Date().toISOString().split('T')[0];
        const todayLogs = allLogs.filter(l => {
            const t = l.record_time || l.recordTime;
            return t && new Date(t).toISOString().startsWith(todayStr);
        });
        console.log(`[SyncNow] Today's logs (${todayStr}): ${todayLogs.length}`);

        if (todayLogs.length === 0) {
            console.log('[SyncNow] No logs to sync for today.');
            return;
        }

        // Adapt and process
        const adaptedLogs = todayLogs.map((l: any) => ({
            staff_number: String(l.user_id || l.userId || l.deviceUserId || l.uid || ''),
            timestamp: l.record_time || l.recordTime || new Date()
        })).filter((l: any) => l.staff_number && l.staff_number !== '');

        console.log(`[SyncNow] Processing ${adaptedLogs.length} valid logs...`);
        const result = await AttendanceService.processBiometricLogs(adaptedLogs);

        console.log(`\n✅ Sync Complete!`);
        console.log(`   Success : ${result.success}`);
        console.log(`   Failed  : ${result.failed}`);
        if (result.errors.length > 0) {
            console.log('   Errors  :');
            result.errors.forEach((e: string) => console.log(`     - ${e}`));
        }
    } finally {
        try { await zk.disconnect(); } catch (_) { }
        await prisma.$disconnect();
    }
}

main().catch(async e => {
    console.error('Fatal:', e.message);
    await prisma.$disconnect();
    process.exit(1);
});
