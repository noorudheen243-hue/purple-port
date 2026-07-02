const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const leadCount = await prisma.lead.count();
  const crmLeadCount = await prisma.crmLead.count();
  console.log('Total Leads:', leadCount);
  console.log('Total CrmLeads:', crmLeadCount);
  
  if (leadCount > 0) {
    const leads = await prisma.lead.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    console.log('Sample Leads:', JSON.stringify(leads, null, 2));
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
