import { PrismaClient } from '@prisma/client';
const ZKLib = require('node-zklib');

const prisma = new PrismaClient();

async function debugData() {
    console.log('--- DEBUGGING BIOMETRIC DATA ---');

    // 1. Fetch DB Staff
    const staff = await prisma.staffProfile.findMany({
        select: { staff_number: true, user: { select: { full_name: true } } }
    });
    console.log(`DB has ${staff.length} staff.`);
    const validStaffNumbers = new Set(staff.map(s => s.staff_number));

    // Print a few for reference
    staff.slice(0, 5).forEach(s => console.log(`DB: ${s.staff_number} (${s.user.full_name})`));

    // 2. Fetch Device Data
    const deviceIp = '192.168.1.201';
    console.log(`Connecting to ${deviceIp}...`);
    const zk = new ZKLib(deviceIp, 4370, 10000, 4000);

    try {
        await zk.createSocket();
        console.log('Connected to Device.');

        const logs = await zk.getAttendances();
        const logData = Array.isArray(logs) ? logs : (logs.data || []);
        console.log(`Fetched ${logData.length} total logs.`);

        if (logData.length === 0) {
            console.log('!! NO LOGS ON DEVICE !!');
            return;
        }

        // Show last 5 logs RAW
        const recent = logData.slice(-10);
        console.log('--- LAST 10 RAW DEVICE LOGS ---');

        for (const log of recent) {
            const rawId = String(log.deviceUserId);
            // My current logic:
            const padded = parseInt(rawId).toString().padStart(4, '0');
            const mappedId = `QIX${padded}`;

            const match = validStaffNumbers.has(mappedId) ? 'MATCH ✅' : 'NO MATCH ❌';

            console.log(`Raw: "${rawId}" | Mapped: "${mappedId}" | Time: ${log.recordTime} | DB Check: ${match}`);
        }

    } catch (e) {
        console.error('Device Error:', e);
    } finally {
        await zk.disconnect();
        await prisma.$disconnect();
    }
}

debugData();
