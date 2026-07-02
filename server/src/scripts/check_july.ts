import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function runCheck() {
    const records = await db.attendanceRecord.findMany({
        where: { 
            date: { 
                gte: new Date('2026-06-30T00:00:00Z'),
                lte: new Date('2026-07-05T00:00:00Z')
            }
        },
        include: {
            user: true
        }
    });

    for (const rec of records) {
        console.log(`User: ${rec.user?.full_name || rec.user_id}`);
        console.log(`  UTC IN: ${rec.check_in?.toISOString()}`);
        console.log(`  UTC OUT: ${rec.check_out?.toISOString()}`);
    }
}

runCheck().catch(console.error).finally(() => process.exit(0));
