
import { biometricControl } from '../modules/attendance/biometric.service';

async function fetchDeviceLogs() {
    try {
        console.log('Fetching logs from device...');
        const logs = await biometricControl.getAttendanceLogs();
        console.log(`Fetched ${logs.length} logs.`);

        const today = new Date();
        const todayLogs = logs.filter((l: any) => {
            const logDate = new Date(l.recordTime || l.record_time);
            return logDate.getDate() === today.getDate() &&
                logDate.getMonth() === today.getMonth() &&
                logDate.getFullYear() === today.getFullYear();
        });

        console.log(`Found ${todayLogs.length} logs for TODAY (${today.toDateString()}):`);
        if (todayLogs.length > 0) {
            console.log('Log Keys:', Object.keys(todayLogs[0]));
        }
        todayLogs.forEach((l: any) => {
            console.log(`User ID: ${l.user_id} (Type: ${typeof l.user_id}) | Time: ${l.recordTime || l.record_time}`);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

fetchDeviceLogs();
