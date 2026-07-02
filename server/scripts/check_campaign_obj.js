const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.marketingCampaign.findFirst({
    where: { name: { contains: "Office Admin 15-06-26" } },
    select: { objective: true }
  });
  console.log("Objective:", c.objective);
}
main().catch(console.error).finally(() => prisma.$disconnect());
