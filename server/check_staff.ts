import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStaff() {
    console.log('Checking Staff Numbers...');
    const staff = await prisma.staffProfile.findMany({
        select: { staff_number: true, user: { select: { full_name: true } } }
    });

    console.log('--- DB Staff List ---');
    staff.forEach(s => console.log(`[${s.staff_number}] ${s.user.full_name}`));
}

checkStaff()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
