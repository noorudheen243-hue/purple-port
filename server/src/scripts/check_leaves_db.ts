import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function main() {
  const records = await db.attendanceRecord.findMany({
    where: {
      status: { in: ['LEAVE', 'LOP'] }
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

  console.log("--- Attendance Records with status LEAVE or LOP ---");
  console.log(`Total records found: ${records.length}`);
  for (const r of records) {
    const localDate = new Date(r.date.getTime() + 330 * 60000).toISOString().split('T')[0];
    console.log(`[${localDate}] Staff: ${r.user?.full_name} (${r.user?.staffProfile?.staff_number})`);
    console.log(`  Status:     ${r.status}`);
    console.log(`  Criteria:   ${r.criteria_mode}`);
    console.log(`  Shift Snap: ${r.shift_snapshot}`);
    console.log("-----------------------------------------");
  }
}

main().catch(console.error).finally(() => db.$disconnect());
