const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const status = await prisma.biometricDeviceStatus.findMany();
    console.log("Device Status on VPS:", status);
    
    // Also get latest 5 biometric records
    const logs = await prisma.attendanceRecord.findMany({
        where: { method: 'BIOMETRIC' },
        orderBy: { date: 'desc' },
        take: 5
    });
    console.log("Latest 5 Biometric Records on VPS:", logs);
}
main().catch(console.error).finally(() => prisma.$disconnect());
