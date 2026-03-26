
import { biometricControl } from '../modules/attendance/biometric.service';

async function inspectLogs() {
    try {
        console.log('Fetching logs for inspection...');
        const logs = await biometricControl.getAttendanceLogs();
        console.log(`Fetched ${logs.length} logs.`);

        console.log('\nFirst 20 Logs Detail:');
        logs.slice(0, 20).forEach((l: any, i: number) => {
            console.log(`${i + 1}. UID/UserID: ${l.user_id ?? l.userId ?? l.deviceUserId ?? l.uid}, Time: ${l.record_time || l.recordTime || l.time}`);
        });

        const uid13Logs = logs.filter((l: any) => String(l.user_id ?? l.userId ?? l.deviceUserId ?? l.uid) === '13');
        console.log(`\nFound ${uid13Logs.length} logs for UID 13.`);
        if (uid13Logs.length > 0) {
            console.log('First 5 logs for UID 13:');
            uid13Logs.slice(0, 5).forEach((l: any) => {
                console.log(`- Time: ${l.record_time || l.recordTime || l.time}`);
            });
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

inspectLogs();
