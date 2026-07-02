import { PrismaClient } from '@prisma/client';
import { syncBiometrics } from '../modules/attendance/biometric.service';
import { AttendanceService } from '../modules/attendance/service';

const prisma = new PrismaClient();

async function fixHistoricalAttendance() {
    console.log("Starting historical attendance fix...");

    try {
        // 1. Clear all old corrupted biometric records
        console.log("Clearing old corrupted biometric logs...");
        const { count } = await prisma.attendanceRecord.deleteMany({
            where: { method: 'BIOMETRIC' }
        });
        console.log(`Deleted ${count} corrupted biometric records.`);

        // 2. Fetch ALL logs from the device and process them
        // This will correctly recreate all check_ins and check_outs with the correct timezone
        console.log("Triggering full biometric sync to restore all logs cleanly...");
        const syncResult = await syncBiometrics('MANUAL');
        console.log("Sync result:", syncResult);

        // 3. Recalculate attendance status for all users from May 1st to today
        console.log("Recalculating attendance statuses...");
        const users = await prisma.user.findMany({ 
            where: { role: { notIn: ['ADMIN'] } } 
        });

        const startDate = new Date('2026-05-01T00:00:00Z');
        const endDate = new Date(); // Today

        let totalRecalculated = 0;
        for (const user of users) {
            console.log(`Recalculating for user: ${user.full_name} (${user.id})...`);
            const result = await AttendanceService.recalculateAttendance(user.id, startDate, endDate);
            totalRecalculated += result.updatedCount || 0;
        }

        console.log(`Successfully recalculated ${totalRecalculated} records.`);
    } catch (e) {
        console.error("Error fixing historical attendance:", e);
    } finally {
        await prisma.$disconnect();
    }
}

fixHistoricalAttendance().catch(console.error);
