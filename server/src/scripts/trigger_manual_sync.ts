
import { syncBiometrics } from '../modules/attendance/biometric.service';

async function triggerManualSync() {
    try {
        console.log('Triggering Manual Sync...');
        const result = await syncBiometrics();
        console.log('Sync Result:', result);
    } catch (error) {
        console.error('Error:', error);
    }
}

triggerManualSync();
