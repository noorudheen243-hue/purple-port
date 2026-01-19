// @ts-ignore
import ZKLib from 'zkteco-js';
import axios from 'axios';

// --- CONFIGURATION ---
const DEVICE_IP = '192.168.1.201'; // Local Device IP
const DEVICE_PORT = 4370;
const SERVER_URL = 'http://72.61.246.22/api'; // Live VPS Backend URL
const API_TOKEN = ''; // Optionally use a long-lived JWT, or we login automatically below.

// Login Credentials for the Bridge to authenticate with Server
const BRIDGE_USER = {
    email: 'bridge@antigravity.com', // MUST BE AN ADMIN
    password: 'bridge_secure_password'
};
// ---------------------

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function sync() {
    // 1. Authenticate with Server
    let token = API_TOKEN;
    if (!token) {
        try {
            const loginResp = await axios.post(`${SERVER_URL}/auth/login`, BRIDGE_USER);
            token = loginResp.data.token;
        } catch (error: any) {
            console.error(`[${new Date().toLocaleTimeString()}] ❌ Server Auth Failed:`, error.message);
            return; // Try again next cycle
        }
    }

    // 2. Connect to Device
    const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 5000, 4000);
    try {
        await zk.createSocket();

        // 3. Fetch & Upload
        const logs = await zk.getAttendances();
        const data = logs.data || [];

        if (data.length > 0) {
            const cleanLogs = data.map((l: any) => ({
                user_id: l.user_id || l.deviceUserId,
                record_time: l.recordTime || l.record_time,
                ip: l.ip
            }));

            console.log(`[${new Date().toLocaleTimeString()}] 📤 Uploading ${data.length} logs...`);

            const uploadResp = await axios.post(
                `${SERVER_URL}/attendance/biometric/upload-logs`,
                { logs: cleanLogs },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log(`[${new Date().toLocaleTimeString()}] ✅ Sync Success: ${uploadResp.data.message}`);
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
