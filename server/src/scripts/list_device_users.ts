
import { biometricControl } from '../modules/attendance/biometric.service';

async function listDeviceUsers() {
    try {
        console.log('Fetching users from device...');
        const result = await biometricControl.getDeviceUsers();
        const users = result.data;

        console.log(`\nFound ${users.length} users on device.`);
        console.log(pad("UID", 10) + " | " + pad("UserID", 15) + " | " + pad("Name", 20));
        console.log("-".repeat(50));

        users.forEach((u: any) => {
            console.log(pad(String(u.uid), 10) + " | " + pad(String(u.userId), 15) + " | " + pad(String(u.name), 20));
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

function pad(str: string, len: number) {
    return (str || '').padEnd(len).substring(0, len);
}

listDeviceUsers();
