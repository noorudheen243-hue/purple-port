
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- Wiping Attendance Data (Fresh Start) ---");

    // Delete all Attendance Records
    const deleted = await prisma.attendanceRecord.deleteMany({});
    console.log(`Deleted ${deleted.count} attendance records.`);

    console.log("--- Reset Complete ---");
}

main().catch(console.error).finally(async () => await prisma.$disconnect());
