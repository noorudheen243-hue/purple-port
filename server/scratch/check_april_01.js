const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkApril01() {
  const startDate = new Date('2026-03-31T00:00:00Z');
  const endDate = new Date('2026-04-02T00:00:00Z');
  
  console.log(`Searching records between ${startDate.toISOString()} and ${endDate.toISOString()}`);

  const records = await prisma.attendanceRecord.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      user: {
        select: {
          full_name: true
        }
      }
    }
  });

  console.log(`Found ${records.length} records around April 01.`);
  records.forEach(r => {
    console.log(`User: ${r.user.full_name}, Date: ${r.date.toISOString()}, Status: ${r.status}, Check-in: ${r.check_in?.toISOString()}, Check-out: ${r.check_out?.toISOString()}`);
  });

  const syncLogs = await prisma.biometricSyncLog.findMany({
    where: {
      sync_time: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  console.log(`Found ${syncLogs.length} sync logs around April 01.`);
  syncLogs.forEach(l => {
     console.log(`Sync Time: ${l.sync_time.toISOString()}, Status: ${l.status}, Saved: ${l.logs_saved}`);
  });
}

checkApril01()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
