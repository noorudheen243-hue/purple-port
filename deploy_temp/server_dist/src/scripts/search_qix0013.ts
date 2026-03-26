
import { biometricControl } from '../modules/attendance/biometric.service';

async function searchQIX0013() {
    try {
        const logs = await biometricControl.getAttendanceLogs();
        const targetLogs = logs.filter((l: any) => {
            const id = String(l.user_id ?? l.userId ?? l.deviceUserId ?? l.uid);
            return id === 'QIX0013' || id === '13';
        });

        console.log(`Search result for QIX0013/13: Found ${targetLogs.length} logs.`);
        if (targetLogs.length > 0) {
            targetLogs.slice(0, 10).forEach((l: any, i: number) => {
                console.log(`${i + 1}. ID: ${l.user_id ?? l.userId ?? l.deviceUserId ?? l.uid}, Time: ${l.record_time || l.recordTime || l.time}`);
            });
        }

        // List all unique IDs in the device
        const uniqueIds = Array.from(new Set(logs.map((l: any) => String(l.user_id ?? l.userId ?? l.deviceUserId ?? l.uid))));
        console.log('\nUnique IDs in Device Logs:', uniqueIds.join(', '));

    } catch (error) {
        console.error('Error:', error);
    }
}

searchQIX0013();
