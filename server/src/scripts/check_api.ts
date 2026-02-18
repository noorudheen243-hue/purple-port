
import { PrismaClient } from '@prisma/client';
import { AttendanceService } from '../modules/attendance/service';

const prisma = new PrismaClient();

async function checkApiOutput() {
    console.log("Simulating API call for Biometric Logs (Feb 17)...");

    const startDate = new Date('2026-02-17');
    const endDate = new Date('2026-02-17');

    // Simulate what the controller does
    const logs = await AttendanceService.getBiometricLogs(startDate, endDate);

    console.log(`Retrieved ${logs.length} logs.`);

    const targets = logs.filter(l => l.user_name.includes('Basil') || l.user_name.includes('Nidhin'));

    console.log("\n--- API Response Simulation ---");
    targets.forEach(l => {
        console.log(`User: ${l.user_name.padEnd(20)} | Status: ${l.status}`);
    });
}

checkApiOutput()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
