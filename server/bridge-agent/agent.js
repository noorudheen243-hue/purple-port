require('dotenv').config();
const ZKLib = require('zkteco-js');
const axios = require('axios');
const cron = require('node-cron');

// --- CONFIGURATION ---
const DEVICE_IP = process.env.DEVICE_IP || '192.168.1.201';
const DEVICE_PORT = parseInt(process.env.DEVICE_PORT || '4370');
const SERVER_URL = process.env.SERVER_URL || 'https://purple-port.com/api/attendance/biometric/bridge/upload';
const API_KEY = process.env.API_KEY || 'default_bridge_key';
const SYNC_INTERVAL = process.env.SYNC_INTERVAL || '*/1 * * * *'; // Default: Every minute

console.log("------------------------------------------");
console.log("   QIX ADS BIOMETRIC BRIDGE AGENT v1.0    ");
console.log("------------------------------------------");
console.log(`Target Device: ${DEVICE_IP}:${DEVICE_PORT}`);
console.log(`Server Endpoint: ${SERVER_URL}`);
console.log(`Sync Interval: ${SYNC_INTERVAL}`);
console.log("------------------------------------------");

// --- STATE ---
let lastLogTime = new Date(0); // Epoch

const getErrMsg = (e) => e.message || e.toString() || 'Unknown Error';

// --- LOGIC ---

async function connectAndFetch(ip, port) {
    let zk = null;
    try {
        zk = new ZKLib(ip, port, 5000, 4000);

        // Manual TCP connection sequence for reliability
        await zk.createSocket();

        console.log(`[${new Date().toLocaleTimeString()}] Connecting to device...`);
        const info = await zk.connect();
        // Note: zkteco-js connect() returns null on failure usually or throws?
        // Actually it doesn't always throw. We check if connected.

        console.log(`[${new Date().toLocaleTimeString()}] Connected! Fetching logs...`);

        const logsData = await zk.getAttendances();
        const logs = logsData?.data || [];

        console.log(`[${new Date().toLocaleTimeString()}] Downloaded ${logs.length} logs.`);

        // ZKTeco JS structure: { userSn, deviceUserId, recordTime, ip }
        // "record_time" might be the key depending on version/firmware, usually "recordTime".
        // Library normalizes it.

        await zk.disconnect();
        return logs;
    } catch (e) {
        if (zk) {
            try { await zk.disconnect(); } catch (ex) { }
        }
        throw e;
    }
}

async function uploadToServer(logs) {
    if (logs.length === 0) return;

    // Filter logs to reduce payload if needed, but server handles dedup.
    // Optimization: Only send logs newer than last successful sync?
    // Risk: If server DB was wiped, we won't re-send.
    // Better: Send logs from "Yesterday" onwards to be safe and efficient.

    // Safety check: Filter out invalid dates
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentLogs = logs.filter(l => {
        const t = new Date(l.recordTime);
        return t > yesterday;
    });

    console.log(`[${new Date().toLocaleTimeString()}] Filtering: ${recentLogs.length} recent logs to upload.`);

    if (recentLogs.length === 0) {
        console.log("No recent logs to sync.");
        return;
    }

    try {
        const payload = {
            logs: recentLogs.map(l => ({
                user_id: l.deviceUserId,
                record_time: l.recordTime
            })),
            deviceId: DEVICE_IP
        };

        const response = await axios.post(SERVER_URL, payload, {
            headers: { 'x-api-key': API_KEY }
        });

        console.log(`[${new Date().toLocaleTimeString()}] Upload Success:`, response.data);
    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] Upload Failed:`, error.message);
        if (error.response) {
            console.error("Server Response:", error.response.data);
        }
    }
}

// --- MAIN LOOP ---

const task = async () => {
    try {
        const logs = await connectAndFetch(DEVICE_IP, DEVICE_PORT);
        await uploadToServer(logs);
    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] Cycle Error:`, getErrMsg(error));
    }
};

// Schedule it
cron.schedule(SYNC_INTERVAL, task);

// Run once immediately on start
task();
