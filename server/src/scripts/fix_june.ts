import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function runFix() {
    const records = await db.attendanceRecord.findMany({
        where: { 
            method: 'BIOMETRIC',
            date: { 
                gte: new Date('2026-05-30T00:00:00Z'),
                lte: new Date('2026-06-05T00:00:00Z')
            }
        }
    });

    const formatIST = (d: Date | null) => d ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(d) : 'null';

    let count = 0;
    for (const rec of records) {
        let newIn = rec.check_in;
        let newOut = rec.check_out;
        let changed = false;

        const OFFSET = 5.5 * 60 * 60 * 1000;

        if (newIn) {
            const istTime = new Date(newIn.getTime() + OFFSET);
            if (istTime.getUTCHours() >= 1 && istTime.getUTCHours() < 7) {
                newIn = new Date(newIn.getTime() + OFFSET);
                changed = true;
            }
        }
        if (newOut) {
            const istTime = new Date(newOut.getTime() + OFFSET);
            if (istTime.getUTCHours() >= 21 || istTime.getUTCHours() < 4) {
                newOut = new Date(newOut.getTime() + OFFSET);
                changed = true;
            }
        }

        if (changed) {
            console.log(`Fixing [${rec.date.toISOString()}] user: ${rec.user_id}`);
            console.log(`  OLD IN : ${formatIST(rec.check_in)} | OLD OUT : ${formatIST(rec.check_out)}`);
            console.log(`  NEW IN : ${formatIST(newIn)} | NEW OUT : ${formatIST(newOut)}`);
            await db.attendanceRecord.update({
                where: { id: rec.id },
                data: {
                    check_in: newIn,
                    check_out: newOut
                }
            });
            count++;
        }
    }
    console.log(`Fixed ${count} records.`);
}

runFix().catch(console.error).finally(() => process.exit(0));
