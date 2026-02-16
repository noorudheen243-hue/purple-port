// @ts-ignore
import ZKLib from 'zkteco-js';
import axios from 'axios';

// --- CONFIGURATION ---
const DEVICE_IP = '192.168.1.201'; // Local Device IP
const DEVICE_PORT = 4370;
const SERVER_URL = 'http://66.116.224.221/api'; // Live VPS Backend URL (using IP until DNS propagates)
const BRIDGE_API_KEY = 'ag_bio_sync_v1_secret_key'; // Matches server default


// ---------------------

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function sync() {
    // 1. Connect to Device
    const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 4000); // Increased timeout to 10s
    try {
        // Robust TCP Connection (matching service.ts)
        await (zk as any).ztcp.createSocket();
        await (zk as any).ztcp.connect();
        (zk as any).connectionType = 'tcp';

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
        console.error(`[${new Date().toLocaleTimeString()}] ⚠️ Device Error:`, error.message || "Unknown");
    } finally {
        try { await zk.disconnect(); } catch (e) { }
    }
}

async function main() {
    console.log("--- Biometric Bridge Agent (Fast-Sync Mode) ---");
    console.log(`Device: ${DEVICE_IP} -> Server: ${SERVER_URL}`);
    console.log("Sync Interval: Every 5 Seconds (Local Network Mode)");
    console.log("-----------------------------------------------");

    while (true) {
        await sync();
        await sleep(5000); // 5 seconds for near-instant sync
    }
}

main();

