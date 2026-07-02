import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function check() {
  const logs = await db.attendanceRecord.findMany({
    where: { 
        method: 'BIOMETRIC',
        date: { gte: new Date('2026-06-01T00:00:00Z') }
    },
    orderBy: { date: 'asc' },
    take: 3
  });
  console.log(JSON.stringify(logs, null, 2));
}
check().catch(console.error).finally(() => process.exit(0));
