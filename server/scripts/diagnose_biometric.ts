/**
 * Biometric Diagnostic Script
 * -----------------------------------------------
 * Checks:
 * 1. Device connectivity (ZK TCP)
 * 2. Raw logs from device + field map
 * 3. Which staff_numbers in DB have NO punch logs today
 * 4. Which device user_ids don't match any staff_number in DB
 *
 * Run from F:\Antigravity\server:
 *   npx ts-node scripts/diagnose_biometric.ts
 */

// @ts-ignore
import ZKLib from 'zkteco-js';
import prisma from '../src/utils/prisma';

const DEVICE_IP = '192.168.1.201';
const DEVICE_PORT = 4370;
const TIMEOUT = 10000;
const INPORT = 4000;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function connectTCP(zk: any): Promise<boolean> {
    try {
        if (zk?.ztcp?.socket && !zk.ztcp.socket.destroyed) {
            try { await zk.disconnect(); } catch (_) { }
        }
        await zk.ztcp.createSocket();
        await zk.ztcp.connect();
        zk.connectionType = 'tcp';
        return true;
    } catch (e: any) {
        return false;
    }
}

async function main() {
    console.log('\n============================================================');
    console.log('  BIOMETRIC DIAGNOSTIC TOOL — Antigravity');
    console.log(`  Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log('============================================================\n');

    // ─────────────────────────────────────────────
    // 1. DEVICE CONNECTIVITY
    // ─────────────────────────────────────────────
    console.log(`[1/4] Connecting to device at ${DEVICE_IP}:${DEVICE_PORT} ...`);
    const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, TIMEOUT, INPORT);
    const connected = await connectTCP(zk);

    if (!connected) {
        console.error(`\n❌ DEVICE OFFLINE — Cannot reach ${DEVICE_IP}:${DEVICE_PORT}`);
        console.log('\nCommon Fixes:');
        console.log('  • Ensure this PC is on the SAME network as the biometric device (192.168.1.x)');
        console.log('  • Ping the device: ping 192.168.1.201');
        console.log('  • Check if port 4370 is blocked by Windows Firewall');
        console.log('  • Ensure the Bridge Agent (run_biometric_bridge.bat) is running\n');
        await prisma.$disconnect();
        process.exit(1);
    }

    console.log('✅ Device ONLINE\n');

    // ─────────────────────────────────────────────
    // 2. DEVICE INFO
    // ─────────────────────────────────────────────
    console.log('[2/4] Fetching device info...');
    try {
        const name = await zk.getDeviceName().catch(() => 'N/A');
        const serial = await zk.getSerialNumber().catch(() => 'N/A');
        const time = await zk.getTime().catch(() => new Date());
        console.log(`  Device Name  : ${name}`);
        console.log(`  Serial No    : ${serial}`);
        console.log(`  Device Time  : ${new Date(time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        const serverTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        console.log(`  Server Time  : ${serverTime}`);
    } catch (e: any) {
        console.warn('  ⚠️  Could not fetch device info:', e.message);
    }

    // ─────────────────────────────────────────────
    // 3. RAW LOG INSPECTION
    // ─────────────────────────────────────────────
    console.log('\n[3/4] Fetching raw attendance logs...');
    let rawLogs: any[] = [];
    try {
        const logsResp = await Promise.race([
            zk.getAttendances(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT after 20s')), 20000))
        ]) as any;
        rawLogs = logsResp?.data || [];
    } catch (e: any) {
        console.error('  ❌ Failed to fetch logs:', e.message);
    }

    console.log(`  Total logs on device: ${rawLogs.length}`);

    if (rawLogs.length > 0) {
        // Show structure of first log to debug field names
        const sample = rawLogs[0];
        console.log('\n  📋 Raw Log Sample (field names):');
        Object.entries(sample).forEach(([k, v]) => {
            console.log(`     ${k}: ${v}`);
        });

        // Today's logs
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const todayLogs = rawLogs.filter(l => {
            const t = l.recordTime || l.record_time;
            return t && new Date(t).toISOString().startsWith(todayStr);
        });

        console.log(`\n  Today's logs (${todayStr}): ${todayLogs.length}`);

        if (todayLogs.length > 0) {
            console.log('\n  Today\'s punches:');
            todayLogs.forEach(l => {
                const uid = l.user_id || l.deviceUserId || l.userId || l.uid || '?';
                const time = l.recordTime || l.record_time || '?';
                console.log(`     User ID: ${uid}  |  Time: ${new Date(time).toLocaleTimeString('en-IN')}`);
            });
        }
    }

    // ─────────────────────────────────────────────
    // 4. CROSS-REFERENCE: Device vs DB
    // ─────────────────────────────────────────────
    console.log('\n[4/4] Cross-referencing with database...');

    // All staff from DB
    const dbStaff = await prisma.staffProfile.findMany({
        include: { user: { select: { full_name: true } } }
    });

    // Today's attendance records already in DB
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayRecords = await prisma.attendanceRecord.findMany({
        where: { date: { gte: todayStart, lte: todayEnd } }
    });
    const staffWithRecord = new Set(todayRecords.map(r => r.user_id));

    // Staff with NO record today
    const missingToday = dbStaff.filter(s => !staffWithRecord.has(s.user_id));

    // Device user IDs from today's logs
    const todayLogs2 = rawLogs.filter(l => {
        const t = l.recordTime || l.record_time;
        return t && new Date(t).toISOString().startsWith(new Date().toISOString().split('T')[0]);
    });
    const deviceUserIdsToday = new Set(
        todayLogs2.map(l => String(l.user_id || l.deviceUserId || l.userId || ''))
    );
    const dbStaffNumbers = new Set(dbStaff.map(s => s.staff_number));

    // Device IDs with no matching staff in DB
    const unmatchedDeviceIds = [...deviceUserIdsToday].filter(id => id && !dbStaffNumbers.has(id));

    // ─── REPORT ───────────────────────────────────
    console.log('\n============================================================');
    console.log('  DIAGNOSTIC REPORT');
    console.log('============================================================');

    console.log(`\n📊 Summary:`);
    console.log(`  • Total staff in DB           : ${dbStaff.length}`);
    console.log(`  • Staff with attendance today : ${todayRecords.length}`);
    console.log(`  • Staff with NO punch today   : ${missingToday.length}`);
    console.log(`  • Unique device punches today : ${deviceUserIdsToday.size}`);
    console.log(`  • Unmatched device IDs        : ${unmatchedDeviceIds.length}`);

    if (missingToday.length > 0) {
        console.log('\n🔴 Staff with NO attendance record today:');
        missingToday.forEach(s => {
            const hasPunchedOnDevice = deviceUserIdsToday.has(s.staff_number);
            const icon = hasPunchedOnDevice ? '⚡ PUNCHED ON DEVICE (not synced!)' : '❌ No punch on device either';
            console.log(`   ${s.staff_number} — ${s.user?.full_name || 'Unknown'} — ${icon}`);
        });
    } else {
        console.log('\n✅ All staff have attendance records for today.');
    }

    if (unmatchedDeviceIds.length > 0) {
        console.log('\n⚠️  Device user IDs with NO matching staff_number in DB:');
        unmatchedDeviceIds.forEach(id => {
            console.log(`   Device UID: "${id}" — NOT found in staff database`);
        });
        console.log('   → These punches are SILENTLY SKIPPED during sync!');
        console.log('   → Fix: Update staff_number in DB to match the device UID, or re-enroll on device.');
    }

    // Last sync check
    const lastBiometricRecord = await prisma.attendanceRecord.findFirst({
        where: { method: 'BIOMETRIC' },
        orderBy: { updatedAt: 'desc' }
    });

    if (lastBiometricRecord) {
        const lastSync = lastBiometricRecord.updatedAt;
        const minutesAgo = Math.round((Date.now() - lastSync.getTime()) / 60000);
        console.log(`\n⏱️  Last biometric sync: ${lastSync.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (${minutesAgo} min ago)`);
        if (minutesAgo > 30) {
            console.log('   ⚠️  WARNING: Last sync was more than 30 minutes ago!');
            console.log('   → Is the Bridge Agent (run_biometric_bridge.bat) currently running?');
        }
    } else {
        console.log('\n❌ No biometric records found in DB at all!');
        console.log('   → The Bridge Agent has never successfully synced data.');
    }

    console.log('\n============================================================');
    console.log('  RECOMMENDATIONS');
    console.log('============================================================');
    console.log('1. Run run_biometric_bridge.bat on this PC (keep it running all day)');
    console.log('2. Ensure device IP is 192.168.1.201 and is accessible on this network');
    console.log('3. Staff numbers in DB must EXACTLY match the User ID enrolled on the device');
    console.log('4. If staff punched but log is missing → use Manual Attendance or Regularisation\n');

    try { await zk.disconnect(); } catch (_) { }
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('Fatal Error:', e);
    await prisma.$disconnect();
    process.exit(1);
});
