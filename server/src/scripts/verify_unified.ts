import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    try {
        const masters = await prisma.ledgerMaster.findMany({
            include: { mappings: true }
        });
        
        console.log(`Verified: Found ${masters.length} Unified Ledgers in database.`);
        if (masters.length > 0) {
            console.log(`Sample: ${masters[0].ledger_name} (${masters[0].entity_type})`);
        }
        
        const status = await prisma.systemSetting.findUnique({ where: { key: 'UNIFIED_LEDGER_ENABLED' } });
        console.log(`System Status: ${status?.value || 'false'}`);
        
        await prisma.$disconnect();
    } catch (e) {
        console.error(e);
    }
}

check();
