import { PrismaClient } from '@prisma/client';
import { AttendanceService } from '../modules/attendance/service';
const db = new PrismaClient();

async function main() {
  const records = await db.attendanceRecord.findMany({
    where: {
      date: {
        gte: new Date('2026-05-01T00:00:00Z'),
        lte: new Date('2026-06-30T23:59:59Z')
      },
      status: 'PRESENT',
      // Skip manual / regularized records
      NOT: [
        { status: 'REGULARIZED' },
        { method: 'MANUAL_ADMIN' }
      ]
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
    }
  });

  console.log(`Auditing ${records.length} 'PRESENT' records in May/June 2026 for anomalies...`);

  let anomaliesCount = 0;
  
  for (const r of records) {
    if (!r.check_in || !r.shift_snapshot) continue;
    
    // Parse shift snapshot "HH:mm-HH:mm"
    const parts = r.shift_snapshot.split('-');
    if (parts.length !== 2) continue;
    
    const startTimeStr = parts[0].trim();
    const endTimeStr = parts[1].trim();
    
    const graceTime = r.grace_time_applied ?? 15;
    const isLate = AttendanceService.isLate(startTimeStr, r.check_in, graceTime);
    
    let isEarly = false;
    if (r.check_out) {
      isEarly = AttendanceService.isEarlyDeparture(endTimeStr, r.check_out, startTimeStr);
    }
    
    if (isLate || isEarly) {
      anomaliesCount++;
      const localDate = new Date(r.date.getTime() + 330 * 60000).toISOString().split('T')[0];
      console.log(`[ANOMALY #${anomaliesCount}] Staff: ${r.user?.full_name} (${r.user?.staffProfile?.staff_number}) on Date: ${localDate}`);
      console.log(`  Check-In:  ${r.check_in.toISOString()}`);
      console.log(`  Check-Out: ${r.check_out ? r.check_out.toISOString() : 'None'}`);
      console.log(`  Shift:     ${r.shift_snapshot} (Grace: ${graceTime} mins)`);
      console.log(`  Late:      ${isLate}`);
      console.log(`  Early Out: ${isEarly}`);
      console.log("-----------------------------------------");
    }
  }

  console.log(`Audit complete. Found ${anomaliesCount} anomalies.`);
}

main().catch(console.error).finally(() => db.$disconnect());
