import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function fixAllLogs() {
  const records = await db.attendanceRecord.findMany({
    where: { 
        method: 'BIOMETRIC',
        date: { gte: new Date('2026-05-30T00:00:00Z') }
    }
  });
  
  let fixed = 0;
  for (const record of records) {
      let newCheckIn = record.check_in;
      let newCheckOut = record.check_out;
      let modified = false;
      
      const IST_OFFSET = 330 * 60 * 1000;

      if (newCheckIn) {
          const istTime = new Date(newCheckIn.getTime() + IST_OFFSET);
          const hours = istTime.getUTCHours();
          // If check-in is between 1 AM and 7 AM IST, it's definitely the -5.5 hour bug
          if (hours >= 1 && hours < 7) {
              newCheckIn = new Date(newCheckIn.getTime() + IST_OFFSET);
              modified = true;
          }
      }
      
      if (newCheckOut) {
          const istTime = new Date(newCheckOut.getTime() + IST_OFFSET);
          const hours = istTime.getUTCHours();
          // If check-out is between 9 PM and 4 AM IST, it's definitely the +5.5 hour bug
          if (hours >= 21 || hours < 4) {
              newCheckOut = new Date(newCheckOut.getTime() - IST_OFFSET);
              modified = true;
          }
      }
      
      if (modified) {
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
  console.log(`Successfully fixed ${fixed} more records using smart heuristic.`);
}
fixAllLogs().catch(console.error).finally(() => process.exit(0));
