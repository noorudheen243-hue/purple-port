import db from '../utils/prisma';

async function main() {
  const r = await db.attendanceRecord.findFirst({
    where: {
      user: { staffProfile: { staff_number: 'QIX0003' } },
      date: new Date('2026-05-31T18:30:00.000Z')
    }
  });
  console.log("NIDHIN RECORD:", r);
}

main().catch(console.error).finally(() => db.$disconnect());
