
import { biometricControl } from '../modules/attendance/biometric.service';

async function inspectUID15() {
    try {
        const logs = await biometricControl.getAttendanceLogs();
        const uid15Logs = logs.filter((l: any) => String(l.user_id ?? l.userId ?? l.deviceUserId ?? l.uid) === '15');

        console.log(`Found ${uid15Logs.length} logs for UID 15.`);
        if (uid15Logs.length > 0) {
            console.log('Recent logs for UID 15:');
            uid15Logs.reverse().slice(0, 10).forEach((l: any, i: number) => {
                console.log(`${i + 1}. Time: ${l.record_time || l.recordTime || l.time}`);
            });
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

inspectUID15();
