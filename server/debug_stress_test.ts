
import { biometricControl } from './src/modules/attendance/biometric.service';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runStressTest() {
    console.log("=== Starting Biometric Stress Test ===");
    console.log("Simulating overlapping requests (Poll + Fetch Users)...");

    // Launch two requests almost simultaneously
    const p1 = biometricControl.getDeviceInfo().then(res => ({ type: 'INFO', res }));
    await delay(100); // Small delay to ensure they are "in flight" together
    const p2 = biometricControl.getDeviceUsers().then(res => ({ type: 'USERS', res }));

    try {
        const results = await Promise.allSettled([p1, p2]);
        results.forEach((r, i) => {
            if (r.status === 'fulfilled') {
                console.log(`Req ${i + 1} Success:`, r.value.type);
            } else {
                console.error(`Req ${i + 1} FAILED:`, r.reason);
            }
        });
    } catch (e) {
        console.error("Critical Failure:", e);
    }

    process.exit(0);
}

runStressTest();
