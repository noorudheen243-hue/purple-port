
import { PrismaClient } from '@prisma/client';
import { biometricControl } from '../modules/attendance/biometric.service';

const db = new PrismaClient();

async function verifySync() {
    console.log("=== Offline Attendance Sync Verification ===\n");

    try {
        console.log("1. Fetching raw logs from the Biometric Device...");
        const deviceInfo = await biometricControl.getDeviceInfo();
        if (deviceInfo.status !== 'ONLINE') {
            console.error("❌ Device is not ONLINE. Cannot verify raw logs.");
            return;
        }

        console.log("Waiting 5s for device socket to stabilize...");
        await new Promise(r => setTimeout(r, 5000));

        const rawLogs = await biometricControl.getAttendanceLogs();
        console.log(`Fetched ${rawLogs.length} raw logs.\n`);

        // Get all staff profiles to map device IDs
        const staffProfiles = await db.staffProfile.findMany({
            include: { user: true }
        });
        const staffMap = new Map();
        staffProfiles.forEach(s => {
            staffMap.set(s.staff_number, s);
        });

        // Group raw logs by Date and Staff ID
        const dateRawLogs: Record<string, Record<string, { punches: Date[] }>> = {};

        rawLogs.forEach((log: any) => {
            const rawDateStr = log.recordTime || log.record_time || log.time;
            if (!rawDateStr) return;

            const timestamp = new Date(rawDateStr);

            // Replicate the IST logic used in service to match db dates
            const IST_OFFSET = 330 * 60 * 1000;
            const istDate = new Date(timestamp.getTime() + IST_OFFSET);
            istDate.setUTCHours(0, 0, 0, 0);
            const dateKey = new Date(istDate.getTime() - IST_OFFSET).toISOString();

            const staffNo = log.deviceUserId || log.userId || log.user_id || log.uid;
            // The service tries to map numeric uid back to QIX string if needed, 
            // but let's assume the device uses QIX000X strings if configured correctly, 
            // or just rely on what's returned.
            // On our previous debug, "user_id" on log object was "QIX0001"

            if (!dateRawLogs[dateKey]) dateRawLogs[dateKey] = {};
            if (!dateRawLogs[dateKey][staffNo]) dateRawLogs[dateKey][staffNo] = { punches: [] };

            dateRawLogs[dateKey][staffNo].punches.push(timestamp);
        });

        console.log("2. Querying database for recent Attendance Records...\n");

        let mismatches = 0;
        let verified = 0;

        // Verify the last 5 active dates
        const dateKeys = Object.keys(dateRawLogs).sort().reverse().slice(0, 5);

        for (const dateKeyStr of dateKeys) {
            const searchDate = new Date(dateKeyStr);
            console.log(`\n--- Verification for Date: ${searchDate.toDateString()} ---`);

            const dbRecords = await db.attendanceRecord.findMany({
                where: { date: searchDate },
                include: { user: { include: { staffProfile: true } } }
            });

            const rawDataForDate = dateRawLogs[dateKeyStr];

            for (const staffNo of Object.keys(rawDataForDate)) {

                const punches = rawDataForDate[staffNo].punches.sort((a, b) => a.getTime() - b.getTime());
                const firstPunch = punches[0];
                const lastPunch = punches[punches.length - 1];

                // Find matching DB record
                const staffRecord = staffProfiles.find(s => s.staff_number === staffNo);
                if (!staffRecord) continue; // Skip unmapped users

                const dbRec = dbRecords.find(r => r.user_id === staffRecord.user_id);

                const staffName = staffRecord.user.full_name;

                if (!dbRec) {
                    console.log(`❌ MISMATCH [${staffName}]: Raw logs exist but NO DB record.`);
                    mismatches++;
                    continue;
                }

                // Format times for comparison
                const fmt = (d: Date | null) => d ? d.toISOString().substr(11, 8) : 'N/A';

                const rawIn = fmt(firstPunch);
                const rawOut = lastPunch.getTime() > firstPunch.getTime() ? fmt(lastPunch) : 'N/A';

                const dbIn = fmt(dbRec.check_in);
                const dbOut = fmt(dbRec.check_out);

                // For Check-out logic: 
                // DB check-out is the max punch time. If only 1 punch, DB check-out might be null.
                const checkInMatch = rawIn === dbIn;

                // Allow DB CheckOut to be N/A if rawOut is N/A
                const checkOutMatch = (rawOut === dbOut) || (!dbRec.check_out && rawOut === 'N/A');

                if (!checkInMatch || !checkOutMatch) {
                    console.log(`❌ MISMATCH [${staffName}]:`);
                    console.log(`   Device -> In: ${rawIn}, Out: ${rawOut}`);
                    console.log(`   DB     -> In: ${dbIn}, Out: ${dbOut}`);
                    mismatches++;
                } else {
                    verified++;
                }
            }
        }

        console.log(`\n=== Verification Complete ===`);
        console.log(`Total Records Verified: ${verified}`);
        if (mismatches > 0) {
            console.log(`Total Mismatches Found: ${mismatches} ❌`);
        } else {
            console.log(`All analyzed logs are perfectly synced! ✅`);
        }

    } catch (e: any) {
        console.error("Error during verification:", e);
    } finally {
        await db.$disconnect();
    }
}

verifySync();
