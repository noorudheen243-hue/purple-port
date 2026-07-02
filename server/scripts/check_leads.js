const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const leads = await prisma.lead.findMany({
    where: { campaignId: null, campaign_name: { not: null } },
    select: { campaign_name: true, id: true }
  });
  console.log('Found ' + leads.length + ' leads with campaign_name but no campaignId');
  const uniqueNames = [...new Set(leads.map(l => l.campaign_name))];
  console.log('Unique names:', uniqueNames);
}
main().catch(console.error).finally(() => prisma.$disconnect());
