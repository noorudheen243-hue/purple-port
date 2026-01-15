
import { biometricControl } from './src/modules/attendance/biometric.service';

async function debugLogs() {
    console.log("Fetching logs...");
    try {
        const logs = await biometricControl.getAttendanceLogs();
        console.log(`Fetched ${logs.length} logs.`);

        if (logs.length > 0) {
            console.log("Sample Log Structure:", logs[0]);
            console.log("Device User IDs found:", logs.slice(0, 5).map(l => l.deviceUserId));
        } else {
            console.log("No logs returned.");
        }

        // Test Connection to Prisma
        const { prisma } = require('./server');
        const staff = await prisma.staffProfile.findFirst();
        console.log("Sample DB Staff Number:", staff?.staff_number);

    } catch (e) {
        console.error("Log Fetch Error:", e);
    }
    process.exit(0);
}

debugLogs();
