
import { PrismaClient } from '@prisma/client';
import { LeaveService } from '../modules/leave/service';
import { AttendanceService } from '../modules/attendance/service';

const prisma = new PrismaClient();

async function main() {
    console.log("--- STARTING TEST RUN ---");

    try {
        // 1. Find a Staff User & an Admin User
        const staff = await prisma.user.findFirst({
            where: { role: { notIn: ['ADMIN', 'MANAGER'] } }
        });

        const admin = await prisma.user.findFirst({
            where: { role: 'ADMIN' }
        });

        if (!staff || !admin) {
            console.error("Test Failed: Need at least one Staff and one Admin user!");
            return;
        }

        console.log(`Using Staff: ${staff.full_name} (${staff.role})`);
        console.log(`Using Admin: ${admin.full_name} (${admin.role})`);

        // 2. Simulate Leave Application
        console.log("\n[TEST] Staff applying for leave...");
        const leave = await LeaveService.applyLeave(
            staff.id,
            'CASUAL',
            new Date(),
            new Date(),
            "Test Leave Reason"
        );
        console.log(`[OK] Leave Created: ID ${leave.id}`);

        // 3. Simulate Regularisation Request
        console.log("\n[TEST] Staff requesting regularisation...");
        const reg = await AttendanceService.requestRegularisation(
            staff.id,
            new Date(),
            'MISSED_PUNCH_IN',
            "Forgot card - Test"
        );
        console.log(`[OK] Regularisation Created: ID ${reg.id}`);

        // 4. Verify Notifications for Admin
        console.log("\n[TEST] Checking Admin Notifications...");
        const notifications = await prisma.notification.findMany({
            where: { user_id: admin.id, read: false },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        console.log(`Found ${notifications.length} unread notifications for Admin.`);

        let leaveNotifFound = false;
        let regNotifFound = false;

        notifications.forEach(n => {
            console.log(` - [${n.type}] ${n.message}`);
            if (n.type === 'LEAVE_REQUEST' && n.message.includes(staff.full_name)) leaveNotifFound = true;
            if (n.type === 'REGULARISATION_REQUEST' && n.message.includes(staff.full_name)) regNotifFound = true;
        });

        if (leaveNotifFound) console.log("[PASS] Admin received Leave Notification");
        else console.error("[FAIL] Admin did NOT receive Leave Notification");

        if (regNotifFound) console.log("[PASS] Admin received Regularisation Notification");
        else console.error("[FAIL] Admin did NOT receive Regularisation Notification");

        // 5. Simulate Admin Approval
        console.log("\n[TEST] Admin approving Leave Request...");
        await LeaveService.updateLeaveStatus(leave.id, admin.id, 'APPROVED');
        console.log("[OK] Leave Approved.");

        // 6. Verify Attendance Record for Leave
        console.log("\n[DEBUG] Fetching ALL attendance records for Staff...");
        const allRecords = await prisma.attendanceRecord.findMany({
            where: { user_id: staff.id },
            orderBy: { date: 'desc' }
        });

        console.log(`[DEBUG] Found ${allRecords.length} records.`);
        allRecords.forEach(r => console.log(` - Date: ${r.date.toISOString()}, Status: ${r.status}, ID: ${r.id}`));

        // Check for ANY 'LEAVE' record
        const leaveRecord = allRecords.find(r => r.status === 'LEAVE');
        if (leaveRecord) {
            console.log("[PASS] Found Attendance Record with status LEAVE");
        } else {
            console.log("[FAIL] No Attendance Record with status LEAVE found.");
        }

        // 7. Simulate Admin Approval for Regularisation
        console.log("\n[TEST] Admin approving Regularisation Request...");
        await AttendanceService.updateRegularisationStatus(reg.id, admin.id, 'APPROVED');
        console.log("[OK] Regularisation Approved.");

        // 8. Verify Attendance Record for Regularisation
        // Refetch
        const allRecordsAfter = await prisma.attendanceRecord.findMany({
            where: { user_id: staff.id },
            orderBy: { date: 'desc' }
        });

        const regRecord = allRecordsAfter.find(r => r.status === 'PRESENT');

        if (regRecord) {
            console.log("[PASS] Found Attendance Record with status PRESENT");
        } else {
            console.error(`[FAIL] No Attendance Record with status PRESENT found.`);
        }

        // Cleanup (Optional - keep data for user to see?)
        // Let's keep it so user can see 'Pending Requests' in the UI as proof.

    } catch (e) {
        console.error("TEST ERROR:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
