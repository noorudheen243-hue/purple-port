const { calculateAutoLOP } = require('./dist/modules/payroll/service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, full_name: true }
  });
  console.log('Calculating LOP for May 2026:');
  for (const u of users) {
    const lop = await calculateAutoLOP(u.id, 5, 2026);
    const halfDays = await prisma.attendanceRecord.count({
      where: {
        user_id: u.id,
        status: 'HALF_DAY',
        date: {
          gte: new Date('2026-05-01T00:00:00Z'),
          lte: new Date('2026-05-31T23:59:59Z')
        }
      }
    });
    console.log(` - ${u.full_name}: LOP = ${lop}, HALF_DAY Count = ${halfDays}`);
  }
}

run().then(() => process.exit(0)).catch(console.error);
