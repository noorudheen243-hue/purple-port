import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function main() {
  const records = await db.attendanceRecord.findMany({
    where: {
      date: {
        gte: new Date('2026-05-31T00:00:00Z'),
        lte: new Date('2026-06-05T23:59:59Z')
      }
    },
    include: {
      user: {
        select: {
          full_name: true,
          staffProfile: {
            select: { staff_number: true }
          }
        }
      }
    },
    orderBy: [
      { date: 'asc' },
      { user: { full_name: 'asc' } }
    ]
  });

  console.log("--- Attendance Records June 1-5, 2026 ---");
  for (const r of records) {
    const localDate = new Date(r.date.getTime() + 330 * 60000).toISOString().split('T')[0];
    const checkInStr = r.check_in ? new Date(r.check_in.getTime() + 330 * 60000).toISOString().replace('T', ' ').substring(0, 19) : 'None';
    const checkOutStr = r.check_out ? new Date(r.check_out.getTime() + 330 * 60000).toISOString().replace('T', ' ').substring(0, 19) : 'None';
    console.log(`[${localDate}] Staff: ${r.user?.full_name} (${r.user?.staffProfile?.staff_number})`);
    console.log(`  Check-In:  ${checkInStr}`);
    console.log(`  Check-Out: ${checkOutStr}`);
    console.log(`  Work Hours: ${r.work_hours}`);
    console.log(`  Status:     ${r.status}`);
    console.log(`  Criteria:   ${r.criteria_mode}`);
    console.log(`  Shift Snap: ${r.shift_snapshot}`);
    console.log("-----------------------------------------");
  }
}

main().catch(console.error).finally(() => db.$disconnect());
