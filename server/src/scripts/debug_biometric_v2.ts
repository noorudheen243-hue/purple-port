import prisma from '../utils/prisma';

async function debug() {
    console.log("--- Biometric Connectivity Debug (v2) ---");
    
    try {
        const status = await prisma.biometricDeviceStatus.findUnique({ where: { id: 'CURRENT' } });
        console.log("Current Database Record:");
        console.log(JSON.stringify(status, null, 2));

        if (status?.last_office_ip) {
            console.log(`✅ Office IP is registered: ${status.last_office_ip}`);
            console.log(`🕒 Registered at: ${status.last_office_registration}`);
        } else {
            console.log("❌ No Office IP registered yet.");
        }

        const deviceIp = '192.168.1.201';
        console.log(`\nLocal IP: ${deviceIp}`);
        
        // Dynamic Resolution Logic Test
        const targetIp = (status?.last_office_ip && status.last_office_ip !== 'unknown') ? status.last_office_ip : deviceIp;
        console.log(`Final Target IP for Sync: ${targetIp}`);

    } catch (e: any) {
        console.error("Debug failed:", e.message);
    } finally {
        process.exit();
    }
}

debug();
