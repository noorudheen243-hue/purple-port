
/**
 * Antigravity Biometric Sync Middleware for eSSL K90 Pro (ZKTeco)
 * ----------------------------------------------------------------
 * 1. Install dependencies: npm install node-zklib axios
 * 2. Configure DEVICE_IP and SERVER_URL below.
 * 3. Run: node biometric-sync.js
 */

const ZKLib = require('node-zklib');
const axios = require('axios');

// --- CONFIGURATION ---
const DEVICE_IP = '192.168.1.201'; // Ensure this matches your Device's Local IP
const DEVICE_PORT = 4370;          // Default ZK Port
const SERVER_URL = 'http://66.116.224.221/api/attendance/biometric-sync'; // Updated to Live VPS
const API_KEY = 'ag_bio_sync_v1_secret_key'; // Set this in your server .env as well

async function sync() {
    console.log(`Connecting to Device ${DEVICE_IP}...`);
    const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 4000);

    try {
        // Create socket to device
        await zk.createSocket();
        console.log('Connected to device!');

        // Get Users (Debug)
        console.log('Fetching users...');
        const users = await zk.getUsers();
        console.log(`Users raw:`, typeof users, Array.isArray(users) ? users.length : users);

        // Get Attendance Logs
        console.log('Fetching attendance logs...');
        let logs = [];
        try {
            const response = await zk.getAttendances();
            logs = response && response.data ? response.data : [];
        } catch (zkErr) {
            console.warn('Warning: Could not fetch logs (possibly empty).', zkErr.message);
            // If it's the subarray error, it means 0 logs.
            logs = [];
        }
        console.log(`Logs retrieved:`, logs.length);

        if (!Array.isArray(logs) || logs.length === 0) {
            console.log('No valid logs to sync.');
            return;
        }

        // Transform logs for Antigravity API
        // ZKLib returns: { deviceUserId, recordTime, ip }
        const payload = logs.map(log => ({
            staff_number: log.deviceUserId, // Ensure this matches 'Staff Number' in Antigravity
            timestamp: log.recordTime
        }));

        // Push to Server
        // Push to Server in Batches
        const BATCH_SIZE = 500;
        console.log(`Pushing data to server in batches of ${BATCH_SIZE}...`);

        for (let i = 0; i < payload.length; i += BATCH_SIZE) {
            const chunk = payload.slice(i, i + BATCH_SIZE);
            console.log(`Sending batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(payload.length / BATCH_SIZE)} (${chunk.length} records)...`);

            try {
                const apiResponse = await axios.post(SERVER_URL, { logs: chunk }, {
                    headers: { 'x-api-key': API_KEY }
                });
                console.log(`Batch success:`, apiResponse.data);
            } catch (batchErr) {
                if (batchErr.response) {
                    console.error(`Batch Error: ${batchErr.response.status} - ${JSON.stringify(batchErr.response.data)}`);
                } else {
                    console.error('Batch Error:', batchErr.message);
                }
            }
        }

        console.log('Sync process completed.');

        // Optional: Clear logs from device after successful sync?
        // WARNING: Only enable if you are sure. ZK devices store limited logs (e.g. 100k).
        // await zk.clearAttendanceLog(); 

    } catch (err) {
        if (err.response) {
            console.error(`Server Error: ${err.response.status} - ${JSON.stringify(err.response.data)}`);
        } else {
            console.error('Sync Error:', err.message || err);
            if (err.code) console.error('Error Code:', err.code);
        }
    } finally {
        // Disconnect
        try {
            await zk.disconnect();
            console.log('Disconnected.');
        } catch (e) { }
    }
}

// Run Sync
sync();
