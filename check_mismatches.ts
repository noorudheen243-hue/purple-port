import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function check() {
  const logs = await db.attendanceRecord.findMany({
    where: { 
        method: 'BIOMETRIC',
        date: { gte: new Date('2026-05-30T00:00:00Z') }
    },
    orderBy: { date: 'asc' }
  });
  
  for (const log of logs) {
      if (log.check_in) {
          const istTime = new Date(log.check_in.getTime() + 330 * 60 * 1000);
          const dateKeyIst = new Date(log.date.getTime() + 330 * 60 * 1000);
          
          if (istTime.getUTCDate() !== dateKeyIst.getUTCDate()) {
              console.log(`Mismatch! ID: ${log.id} | DateKey: ${dateKeyIst.toISOString().split('T')[0]} | CheckIn: ${istTime.toISOString()}`);
          }
      }
  }
}
check().catch(console.error).finally(() => process.exit(0));
