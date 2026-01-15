import { BiometricControlService } from './src/modules/attendance/biometric.service';

async function testService() {
    console.log('[DEBUG] Instantiating Service...');
    const service = new BiometricControlService();

    console.log('[DEBUG] Calling getDeviceInfo (Robust Check)...');
    try {
        const info = await service.getDeviceInfo();
        console.log('[DEBUG] Result:', JSON.stringify(info, null, 2));
    } catch (e) {
        console.error('[DEBUG] FAILED:', e);
    }
}

testService();
