
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFinalStatus() {
    console.log("Checking Final Status for Basil and Nidhin K...");

    const targetDate = new Date('2026-02-16T18:30:00.000Z'); // Feb 17 IST

    const records = await prisma.attendanceRecord.findMany({
        where: {
            date: targetDate,
            user: {
                full_name: { in: ['Basil', 'Nidhin K (Edited)'] }
            }
        },
        include: {
            user: {
                include: { staffProfile: true }
            }
        }
    });

    console.log(`Found ${records.length} records.`);

    for (const r of records) {
        console.log(`User: ${r.user.full_name}`);
        console.log(`  Current Status: ${r.status}`);
        console.log(`  Method: ${r.method}`); // Should be MANUAL_ADMIN
        console.log('---');
    }
}

checkFinalStatus()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
