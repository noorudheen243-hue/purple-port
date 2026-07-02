const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const campaigns = await prisma.marketingCampaign.findMany({
    select: { objective: true, name: true }
  });
  const objs = [...new Set(campaigns.map(c => c.objective))];
  console.log("Unique Objectives:", objs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
