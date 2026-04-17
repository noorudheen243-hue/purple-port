const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function fix() {
    const result = await db.payrollSlip.updateMany({
        where: { status: 'PENDING' },
        data: { status: 'IN_PROGRESS' }
    });
    console.log('Updated ' + result.count + ' slips from PENDING to IN_PROGRESS');
    process.exit(0);
}
fix().catch(e => { console.error(e.message); process.exit(1); });
