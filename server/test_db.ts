
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const records = await prisma.attendanceRecord.findMany({
    where: { method: 'BIOMETRIC', check_out: { not: null } },
    orderBy: { date: 'desc' },
    take: 5
  });
  console.log('Records with check_out:', records.length > 0 ? records : 'NONE');

  const recent = await prisma.attendanceRecord.findMany({
    where: { method: 'BIOMETRIC' },
    orderBy: { date: 'desc' },
    take: 5
  });
  console.log('Recent records:', recent);
}
main().catch(console.error).finally(() => prisma.$disconnect());

