import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const t = await prisma.task.findMany({
        where: { status: 'COMPLETED', department: 'CREATIVE' }
    });
    console.log('Total completed creative tasks:', t.length);
    if (t.length > 0) {
        console.log('Sample task date:', t[0].completed_date);
    }
}
run();
