
import { syncBiometrics } from './src/modules/attendance/biometric.service';

(async () => {
    try {
        console.log('Starting Manual Sync Verification...');
        if (syncBiometrics) {
            console.log('Found syncBiometrics function.');
            const result = await syncBiometrics();
            console.log('Sync Result:', result);
        } else {
            console.error('syncBiometrics export NOT found.');
        }
        process.exit(0);
    } catch (e) {
        console.error('Verification Error:', e);
        process.exit(1);
    }
})();
