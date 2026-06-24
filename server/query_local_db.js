const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.attendanceRecord.count({
        where: { method: 'BIOMETRIC' }
    });
    console.log("Local biometric records count:", count);
    
    if (count > 0) {
        const records = await prisma.attendanceRecord.findMany({
            where: { method: 'BIOMETRIC' }
        });
        const fs = require('fs');
        fs.writeFileSync('local_biometric_backup.json', JSON.stringify(records, null, 2));
        console.log("Saved local records to local_biometric_backup.json");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
