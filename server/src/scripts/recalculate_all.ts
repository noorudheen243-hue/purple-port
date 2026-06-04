import db from '../utils/prisma';
import { AttendanceService } from '../modules/attendance/service';

async function main() {
  const staff = await db.staffProfile.findMany({
    select: { user_id: true, staff_number: true }
  });

  const startDate = new Date(2026, 4, 1); // May 1, 2026
  const endDate = new Date(2026, 5, 30);   // June 30, 2026

  console.log(`Recalculating attendance for ${staff.length} staff members from May 1 to June 30, 2026...`);
  for (const s of staff) {
    try {
      const res = await AttendanceService.recalculateAttendance(s.user_id, startDate, endDate);
      console.log(`Staff ${s.staff_number}: recalculated ${res.updatedCount} records.`);
    } catch (e: any) {
      console.error(`Failed for staff ${s.staff_number}:`, e.message);
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
