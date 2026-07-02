import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function fixLogs() {
  const records = await db.attendanceRecord.findMany({
    where: { 
        method: 'BIOMETRIC',
        date: { gte: new Date('2026-06-01T00:00:00Z') }
    }
  });
  
  let fixed = 0;
  for (const record of records) {
      if (record.work_hours && record.work_hours > 16) {
          // It's definitely corrupted with the double offset bug
          let newCheckIn = record.check_in;
          let newCheckOut = record.check_out;
          
          if (newCheckIn) {
              // Add 5.5 hours
              newCheckIn = new Date(newCheckIn.getTime() + 5.5 * 60 * 60 * 1000);
          }
          if (newCheckOut) {
              // Subtract 5.5 hours
              newCheckOut = new Date(newCheckOut.getTime() - 5.5 * 60 * 60 * 1000);
          }
          
          const workHours = newCheckOut && newCheckIn ? (newCheckOut.getTime() - newCheckIn.getTime()) / (1000 * 60 * 60) : record.work_hours;
          
          await db.attendanceRecord.update({
              where: { id: record.id },
              data: {
                  check_in: newCheckIn,
                  check_out: newCheckOut,
                  work_hours: workHours
              }
          });
          fixed++;
      }
  }
  console.log(`Successfully fixed ${fixed} records.`);
}
fixLogs().catch(console.error).finally(() => process.exit(0));
