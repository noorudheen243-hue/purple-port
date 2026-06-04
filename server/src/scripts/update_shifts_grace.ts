import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function main() {
  const result = await db.shift.updateMany({
    where: {
      name: {
        in: ['Normal Shift', 'Ramzan Shift 01', 'Ramzan Shift 02']
      }
    },
    data: {
      default_grace_time: 15
    }
  });
  console.log(`Updated ${result.count} shifts to 15 minutes grace time in database.`);
}

main().catch(console.error).finally(() => db.$disconnect());
