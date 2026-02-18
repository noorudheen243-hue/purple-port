
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStatusAndCriteria() {
    console.log("Checking Status and Criteria for Basil and Nidhin K...");

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
        const staff = r.user.staffProfile;
        const criteria = (staff as any).punch_in_criteria || 'N/A';
        const workHours = r.work_hours || 0;

        console.log(`User: ${r.user.full_name}`);
        console.log(`  Current Status: ${r.status}`);
        console.log(`  Criteria: ${criteria}`);
        console.log(`  Work Hours: ${workHours.toFixed(2)}`);
        console.log(`  Check In: ${r.check_in}`);
        console.log(`  Check Out: ${r.check_out}`);
        console.log('---');
    }
}

checkStatusAndCriteria()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
