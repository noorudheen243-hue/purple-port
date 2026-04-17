
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const settings = await (prisma as any).systemSetting.findMany({
    where: { key: { in: ['META_APP_ID', 'META_APP_SECRET'] } }
  });
  console.log('--- System Settings ---');
  console.log(JSON.stringify(settings, null, 2));

  const metaTokens = await (prisma as any).metaToken.findMany({
      take: 5
  });
  console.log('--- Recent Meta Tokens ---');
  console.log(JSON.stringify(metaTokens.map((t: any) => ({ ...t, access_token: '***' })), null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
