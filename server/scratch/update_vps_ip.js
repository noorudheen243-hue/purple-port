const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const newIp = '59.93.233.170';
    console.log(`Updating office IP to ${newIp}...`);
    
    await prisma.biometricDeviceStatus.upsert({
        where: { id: 'CURRENT' },
        create: { 
            id: 'CURRENT', 
            status: 'ONLINE', 
            last_heartbeat: new Date(), 
            last_office_ip: newIp,
            last_office_registration: new Date(),
            updatedAt: new Date()
        },
        update: { 
            last_office_ip: newIp,
            last_office_registration: new Date(),
            updatedAt: new Date()
        }
    });
    
    console.log("Updated Office IP. Now triggering sync...");
    
    try {
        const { syncBiometrics } = require('./src/modules/attendance/biometric.service');
        const result = await syncBiometrics('MANUAL');
        console.log("Sync Result:", result);
    } catch (e) {
        console.log("Sync failed:", e.message);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
