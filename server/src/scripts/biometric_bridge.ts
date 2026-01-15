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

async function main() {
    console.log("--- Biometric Bridge Agent Started ---");
    console.log(`Target Device: ${DEVICE_IP}`);
    console.log(`Target Server: ${SERVER_URL}`);

    // 1. Authenticate with Server
    let token = API_TOKEN;
    if (!token) {
        console.log("Authenticating with Server...");
        try {
            const loginResp = await axios.post(`${SERVER_URL}/auth/login`, BRIDGE_USER);
            token = loginResp.data.token;
            console.log("Authentication Successful.");
            console.log("DEBUG: Received Token:", token ? (token.substring(0, 10) + "...") : "UNDEFINED/NULL");
        } catch (error: any) {
            console.error("Server Authentication Failed:", error.message);
            console.error("Check SERVER_URL and BRIDGE_USER credentials.");
            process.exit(1);
        }
    }

    // 2. Connect to Device
    console.log("Connecting to Biometric Device...");
    const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 5000, 4000);

    try {
        await zk.createSocket();

        console.log("Fetching Attendance Logs...");
        const logs = await zk.getAttendances();
        const data = logs.data || [];
        console.log(`Fetched ${data.length} logs from device.`);

        if (data.length > 0) {
            // 3. Push to Server
            console.log("Uploading logs to Server...");
            // Map ZK log format to what our backend expects if needed, 
            // but our backend usually handles the raw ZK format from the library.
            // Expected by backend: { userSn, deviceUserId, recordTime, ip } (roughly)
            // ZKLib returns: { userSn, deviceUserId, recordTime, ip } 

            // Clean data keys just in case (zkteco-js sometimes uses different casing)
            const cleanLogs = data.map((l: any) => ({
                user_id: l.deviceUserId, // Map to what our service expects
                record_time: l.recordTime,
                ip: l.ip
            }));

            await axios.post(
                `${SERVER_URL}/attendance/biometric/upload-logs`,
                { logs: cleanLogs },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log("Upload Successful!");

            // Optional: Clear logs from device to prevent pile-up?
            // console.log("Clearing Device Logs...");
            // await zk.clearAttendanceLog(); 
        } else {
            console.log("No new logs to upload.");
        }

    } catch (error: any) {
        console.error("Device/Upload Error:", error.message || error);
    } finally {
        try {
            await zk.disconnect();
            console.log("Disconnected from Device.");
        } catch (e) { }
    }
}

main();
