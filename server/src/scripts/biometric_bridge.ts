// @ts-ignore
import ZKLib from 'zkteco-js';
import axios from 'axios';

// --- CONFIGURATION ---
const DEVICE_IP = '192.168.1.201'; // Local Device IP
const DEVICE_PORT = 4370;
const SERVER_URL = 'http://72.61.246.22/api'; // Live VPS Backend URL
const BRIDGE_API_KEY = 'ag_bio_sync_v1_secret_key'; // Matches server default
// ---------------------

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function sync() {
    // 1. Connect to Device
    const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 5000, 4000);
    try {
        await zk.createSocket();

        // 2. Fetch & Upload
        const logs = await zk.getAttendances();
        const data = logs.data || [];

        if (data.length > 0) {
            const cleanLogs = data.map((l: any) => ({
                user_id: l.user_id || l.deviceUserId,
                record_time: l.recordTime || l.record_time,
                ip: l.ip
            }));

            console.log(`[${new Date().toLocaleTimeString()}] 📤 Found ${data.length} logs. Uploading...`);

            try {
                const uploadResp = await axios.post(
                    `${SERVER_URL}/attendance/biometric/bridge/upload`,
                    { logs: cleanLogs },
                    {
                        headers: {
                            'x-api-key': BRIDGE_API_KEY,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                console.log(`[${new Date().toLocaleTimeString()}] ✅ Sync Success: ${uploadResp.data.message}`);
            } catch (apiError: any) {
                console.error(`[${new Date().toLocaleTimeString()}] ❌ Upload Failed:`, apiError.message);
                if (apiError.response) console.error('Server Responded:', apiError.response.data);
            }

        } else {
            console.log(`[${new Date().toLocaleTimeString()}] 💤 Device Online. No new logs.`);
        }

    } catch (error: any) {
        console.error(`[${new Date().toLocaleTimeString()}] ⚠️ Device Connection Error:`, error.message || "Unknown error");
    } finally {
        try { await zk.disconnect(); } catch (e) { }
    }
}

async function main() {
    console.log("--- Biometric Bridge Agent (Auto-Sync Mode) ---");
    console.log(`Target: ${DEVICE_IP} -> ${SERVER_URL}`);
    console.log("Sync Interval: Every 60 Seconds");
    console.log("-----------------------------------------------");

    while (true) {
        await sync();
        console.log("Waiting 60s...");
        await sleep(60000);
    }
}

main();
