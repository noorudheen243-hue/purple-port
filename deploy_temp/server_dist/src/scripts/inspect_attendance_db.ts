
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function inspectRecords() {
    try {
        const records = await db.attendanceRecord.findMany({
            where: {
                date: {
                    gte: new Date('2026-02-18T00:00:00.000Z'),
                    lte: new Date('2026-02-18T23:59:59.999Z')
                }
            },
            include: { user: { select: { full_name: true } } },
            orderBy: { updatedAt: 'desc' },
            take: 20
        });

        console.log("=== DB Record Inspection ===\n");
        records.forEach((r: any) => {
            console.log(`User: ${pad(r.user?.full_name, 20)} | Date: ${r.date.toISOString().substr(0, 10)} | In: ${r.check_in?.toISOString() || 'N/A'} | Out: ${r.check_out?.toISOString() || 'N/A'} | Method: ${r.method} | Status: ${r.status}`);
        });

    } finally {
        await db.$disconnect();
    }
}

function pad(str: string, len: number) {
    return (str || '').padEnd(len).substring(0, len);
}

inspectRecords().catch(console.error);
