
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkVPSTimes() {
    console.log("Checking Punch-Out Times for Feb 19...");

    const dateKeyIST = new Date('2026-02-18T18:30:00.000Z');
    const dateKeyUTC = new Date('2026-02-19T00:00:00.000Z');

    const records = await prisma.attendanceRecord.findMany({
        where: {
            date: { in: [dateKeyIST, dateKeyUTC] },
            check_in: { not: null }
        },
        include: {
            user: { include: { staffProfile: true } }
        }
    });

    console.log(`Found ${records.length} records.`);

    records.forEach(r => {
        const name = r.user.full_name;
        const staffId = r.user.staffProfile?.staff_number;
        const inTime = r.check_in ? r.check_in.toISOString() : 'N/A';
        const outTime = r.check_out ? r.check_out.toISOString() : 'MISSING';

        console.log(`${staffId} | ${name} | In: ${inTime} | Out: ${outTime}`);
    });
}

checkVPSTimes()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
