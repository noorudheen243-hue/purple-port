import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkApril01() {
  const date = new Date('2026-04-01');
  const IST_OFFSET = 330 * 60 * 1000;
  // In the service, they use IST Midnight as the key.
  // 2026-04-01 IST Midnight is 2026-03-31 18:30 UTC.
  const dateKey = new Date(date.getTime() - IST_OFFSET);
  
  console.log(`Checking date: ${date.toISOString()}`);
  console.log(`Date Key (IST Midnight): ${dateKey.toISOString()}`);

  const records = await prisma.attendanceRecord.findMany({
    where: {
      date: dateKey
    },
    include: {
      user: {
        select: {
          full_name: true
        }
      }
    }
  });

  console.log(`Found ${records.length} records for April 01.`);
  records.forEach(r => {
    console.log(`User: ${r.user.full_name}, Status: ${r.status}, Check-in: ${r.check_in}, Check-out: ${r.check_out}`);
  });

  const logs = await prisma.biometricLog.findMany({
    where: {
      timestamp: {
        gte: new Date('2026-04-01T00:00:00Z'),
        lte: new Date('2026-04-01T23:59:59Z')
      }
    }
  });

  console.log(`Found ${logs.length} biometric logs for April 01.`);
}

checkApril01()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
