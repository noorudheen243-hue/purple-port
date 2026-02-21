
console.log("Starting DEBUG script...");

async function run() {
    try {
        console.log("Loading Prisma...");
        const { PrismaClient } = require('@prisma/client');
        const db = new PrismaClient();

        console.log("Loading Biometric Service...");
        const { biometricControl, syncBiometrics, processBiometricLogs } = require('../modules/attendance/biometric.service');
        console.log("Service loaded.");

        console.log("--- Biometric Auto-Detect & Sync Test ---\n");

        // 1. Check Device Info (Should use Auto-Detect)
        console.log("1. Checking Device Status...");
        const deviceInfo = await biometricControl.getDeviceInfo();
        console.log("Device Info:", deviceInfo);

        if (deviceInfo.status !== 'ONLINE') {
            console.error("❌ Device is OFFLINE. Aborting sync.");
            return;
        }

        if (deviceInfo.serialNumber === 'SYNCED-VIA-BRIDGE') {
            console.log("⚠️  Using BRIDGE MODE (VPS Logic). Physical connection failed or skipped.");
        } else {
            console.log("✅ Using DIRECT CONNECTION (Local Logic).");
        }

        // 2. Run Sync
        console.log("\nWaiting 2s for device to release socket...");
        await new Promise(r => setTimeout(r, 2000));

        console.log("\n2. Executing Sync...");

        // INTERCEPT: Get logs directly first to analyze dates
        const logs = await biometricControl.getAttendanceLogs();
        console.log(`Fetched ${logs.length} raw logs from device.`);

        // Analyze Dates
        if (logs.length > 0) {
            console.log("Sample Log Object:", JSON.stringify(logs[0]));
        }

        const dateCounts: Record<string, number> = {};
        logs.forEach((l: any) => {
            let dString = 'Invalid';
            const rawDate = l.recordTime || l.record_time || l.time;
            if (rawDate) dString = new Date(rawDate).toISOString().split('T')[0];
            else if (l.match) dString = 'RawMatch?';

            dateCounts[dString] = (dateCounts[dString] || 0) + 1;
        });
        console.log("Raw Log Counts by Date (UTC):", dateCounts);

        const syncResult = await processBiometricLogs(logs);
        console.log("Sync Result:", syncResult);

        // 3. Verify Recent Logs (Last 24h)
        console.log("\n3. Verifying DB Logs (Last 24h)...");
        // Look back 30 hours to cover IST offset shifts
        const searchStart = new Date(Date.now() - 30 * 60 * 60 * 1000);

        const recentLogs = await db.attendanceRecord.findMany({
            where: {
                updatedAt: { gte: searchStart }
            },
            include: { user: { select: { full_name: true } } },
            orderBy: { date: 'desc' }
        });

        if (recentLogs.length === 0) {
            console.log("⚠️  No recent logs found.");
        } else {
            console.log(pad("User", 20) + " | " + pad("Date (Stored)", 24) + " | " + pad("Check In", 12) + " | " + pad("Status", 10));
            console.log("-".repeat(80));
            recentLogs.forEach((r: any) => {
                const checkIn = r.check_in ? r.check_in.toISOString().substr(11, 8) : '-';
                console.log(
                    pad(r.user?.full_name, 20) + " | " +
                    pad(r.date.toISOString(), 24) + " | " +
                    pad(checkIn, 12) + " | " +
                    pad(r.status, 10)
                );
            });
        }

        await db.$disconnect();

    } catch (e: any) {
        console.error("❌ SCRIPT ERROR:", e);
    }
}

function pad(str: string, len: number) {
    return (str || '').padEnd(len).substring(0, len);
}

run();
