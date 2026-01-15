import { syncBiometrics } from './src/modules/attendance/biometric.service';

console.log('Testing Biometric Sync invocation...');
syncBiometrics()
    .then(() => console.log('Test Complete'))
    .catch(console.error);
