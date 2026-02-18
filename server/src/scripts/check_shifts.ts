
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkShifts() {
    console.log("Checking Shift Presets...");
    const shifts = await prisma.shift.findMany();
    console.log(shifts);
}

checkShifts()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
