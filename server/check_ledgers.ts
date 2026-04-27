
import prisma from './utils/prisma';

async function checkClientLedgers() {
    const ledgers = await prisma.ledger.findMany({
        where: { entity_type: 'CLIENT' },
        include: { head: true }
    });
    
    const clientMap = {};
    ledgers.forEach(l => {
        if (!clientMap[l.entity_id]) clientMap[l.entity_id] = [];
        clientMap[l.entity_id].push({ name: l.name, head: l.head.code, id: l.id });
    });
    
    Object.entries(clientMap).forEach(([clientId, ledgers]) => {
        if (ledgers.length > 1) {
            console.log(`Client ${clientId} (${ledgers[0].name}) has ${ledgers.length} ledgers:`, ledgers);
        }
    });
    
    await prisma.$disconnect();
}

checkClientLedgers();
