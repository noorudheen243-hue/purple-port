import { PrismaClient } from './src/utils/prisma';
const prisma = new PrismaClient();

async function main() {
    const result = await prisma.attendanceRecord.updateMany({
        where: { method: 'BIOMETRIC_SYNC' },
        data: { method: 'BIOMETRIC' }
    });
    console.log(`Fixed ${result.count} records`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
