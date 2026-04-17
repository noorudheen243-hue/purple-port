
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const allSettings = await (prisma as any).systemSetting.findMany();
  console.log('--- ALL SYSTEM SETTINGS ---');
  allSettings.forEach((s: any) => {
      console.log(`- ${s.key}: ${s.value} (ID: ${s.id})`);
  });

  const metaTokens = await (prisma as any).metaToken.findMany({
      take: 10
  });
  console.log('--- RECENT META TOKENS ---');
  metaTokens.forEach((t: any) => {
      console.log(`- ${t.account_name} (${t.meta_user_id}) - Expires: ${t.expires_at}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
