import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function check() {
  const logs = await db.attendanceRecord.findMany({
    where: { 
        method: 'BIOMETRIC',
        date: { 
            gte: new Date('2026-05-31T00:00:00Z'),
            lte: new Date('2026-06-03T00:00:00Z')
        }
    },
    orderBy: { date: 'asc' }
  });
  
  for (const log of logs) {
      const formatIST = (d: Date | null) => d ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(d) : 'null';
      console.log(`[${log.date.toISOString().split('T')[0]}] ${log.user_id} | IN: ${formatIST(log.check_in)} | OUT: ${formatIST(log.check_out)} | HRS: ${log.work_hours}`);
  }
}
check().catch(console.error).finally(() => process.exit(0));
