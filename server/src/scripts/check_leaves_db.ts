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

  const approvedLeaves = await db.leaveRequest.findMany({
    where: { status: 'APPROVED' },
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
    orderBy: { start_date: 'asc' }
  });

  console.log("\n--- Approved Leave Requests ---");
  console.log(`Total approved leaves: ${approvedLeaves.length}`);
  for (const l of approvedLeaves) {
    const startStr = new Date(l.start_date.getTime() + 330 * 60000).toISOString().split('T')[0];
    const endStr = new Date(l.end_date.getTime() + 330 * 60000).toISOString().split('T')[0];
    console.log(`Staff: ${l.user?.full_name} (${l.user?.staffProfile?.staff_number})`);
    console.log(`  Type:  ${l.type}`);
    console.log(`  Dates: ${startStr} to ${endStr}`);
    console.log(`  Halfday: ${l.is_half_day}`);
    console.log(`  Reason: ${l.reason}`);
    console.log("-----------------------------------------");
  }
}

main().catch(console.error).finally(() => db.$disconnect());
