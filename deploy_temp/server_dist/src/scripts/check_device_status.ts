
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function checkDeviceStatus() {
    const status = await db.biometricDeviceStatus.findUnique({ where: { id: 'CURRENT' } });
    console.log("Device Status:", JSON.stringify(status, null, 2));
}

checkDeviceStatus()
    .catch(console.error)
    .finally(() => db.$disconnect());
