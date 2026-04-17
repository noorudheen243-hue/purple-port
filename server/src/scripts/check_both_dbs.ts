
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./dev.db',
    },
  },
});

async function main() {
  const settings = await (prisma as any).systemSetting.findMany({
    where: { key: 'META_APP_ID' }
  });
  console.log('--- Database (server/dev.db) ---');
  console.log(JSON.stringify(settings, null, 2));
  
  const prismaSub = new PrismaClient({
    datasources: {
      db: {
        url: 'file:./prisma/dev.db',
      },
    },
  });
  const settingsSub = await (prismaSub as any).systemSetting.findMany({
    where: { key: 'META_APP_ID' }
  });
  console.log('--- Database (server/prisma/dev.db) ---');
  console.log(JSON.stringify(settingsSub, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
