const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const campaigns = await prisma.marketingCampaign.findMany({
    include: { leads: true, CrmLead: true }
  });
  console.log('Total Campaigns:', campaigns.length);
  const withLeads = campaigns.filter(c => c.leads.length > 0 || c.CrmLead.length > 0);
  console.log('Campaigns with leads:', withLeads.length);
  for (const c of withLeads) {
    console.log(c.name, '- Leads:', c.leads.length, '- CrmLeads:', c.CrmLead.length);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
