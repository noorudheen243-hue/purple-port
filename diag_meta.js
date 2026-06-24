const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const accts = await p.marketingAccount.findMany({ where: { platform: 'meta' }, include: { metaToken: true } });
  console.log('=== Marketing Accounts ===', accts.length);
  accts.forEach(a => console.log(JSON.stringify({
    clientId: a.clientId, acctId: a.externalAccountId, name: a.name,
    hasMetaToken: !!a.metaToken, hasAccessToken: !!a.accessToken
  })));

  const leads = await p.lead.count();
  console.log('Total leads in DB:', leads);

  const autoLeads = await p.lead.count({ where: { source: 'AUTO' } });
  console.log('AUTO (Meta) leads:', autoLeads);

  const campaigns = await p.marketingCampaign.findMany({
    where: { platform: 'meta' },
    select: { id: true, name: true, clientId: true, externalCampaignId: true }
  });
  console.log('=== Meta Campaigns ===', campaigns.length);
  campaigns.slice(0, 10).forEach(c => console.log(JSON.stringify(c)));
  await p.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
