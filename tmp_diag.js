const {PrismaClient} = require("./node_modules/@prisma/client");
const p = new PrismaClient();
async function main() {
    const accounts = await p.marketingAccount.findMany({
        include: { client: { select: { name: true } }, metaToken: { select: { id: true, page_name: true } } }
    });
    console.log("=== MARKETING ACCOUNTS ===");
    for (const a of accounts) {
        console.log(`  [${a.platform}] ${a.externalAccountId} | Client: ${a.client?.name} | Token: ${a.accessToken ? "DIRECT" : a.metaToken ? "META_TOKEN("+a.metaToken.page_name+")" : "NONE"}`);
    }

    const camps = await p.marketingCampaign.groupBy({ by: ["status"], _count: { id: true } });
    console.log("\n=== CAMPAIGNS BY STATUS ===");
    for (const g of camps) { console.log(`  ${g.status}: ${g._count.id}`); }

    const metrics = await p.marketingMetric.count();
    console.log(`\n=== TOTAL METRICS: ${metrics} ===`);
    
    const syncLogs = await p.marketingSyncLog.findMany({ orderBy: { startedAt: "desc" }, take: 3 });
    console.log("\n=== LAST 3 SYNC LOGS ===");
    for (const l of syncLogs) { console.log(`  ${l.status} | ${l.startedAt?.toISOString()} | ${l.details || ""}`); }
}
main().finally(() => p.$disconnect());
