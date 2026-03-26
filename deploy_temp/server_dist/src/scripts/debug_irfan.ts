
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugIrfan() {
    console.log("Debugging Irfan's Record (Feb 19)...");

    const user = await prisma.user.findFirst({
        where: { staffProfile: { staff_number: 'QIX0011' } } // Irfan's ID
    });

    if (!user) {
        console.log("User Irfan (QIX0011) not found.");
        return;
    }

    // List ALL records for him for Feb 18/19 just to be sure
    const records = await prisma.attendanceRecord.findMany({
        where: {
            user_id: user.id,
            date: {
                gte: new Date('2026-02-18T00:00:00.000Z'),
                lte: new Date('2026-02-20T00:00:00.000Z')
            }
        }
    });

    console.log(`Found ${records.length} records for Irfan.`);
    records.forEach(r => {
        console.log(`Date: ${r.date.toISOString()} | In: ${r.check_in?.toISOString()} | Out: ${r.check_out?.toISOString()} | Status: ${r.status}`);
    });
}

debugIrfan()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
