const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const campaigns = await prisma.marketingCampaign.findMany({
    where: { name: { contains: "Office Admin 15-06-26" } },
    include: { marketingMetrics: true, leads: true }
  });
  console.log("Campaigns found:", campaigns.length);
  for (const c of campaigns) {
    console.log(`Campaign: ${c.name} (${c.id})`);
    console.log(`Leads in DB: ${c.leads.length}`);
    let sumResults = 0;
    let sumMsgConv = 0;
    for (const m of c.marketingMetrics) {
      console.log(`- Metric Date: ${m.date}, results: ${m.results}, msg_conv: ${m.messaging_conversations}`);
      sumResults += m.results || 0;
      sumMsgConv += m.messaging_conversations || 0;
    }
    console.log(`Total Results: ${sumResults}, Total Msg Conv: ${sumMsgConv}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
