// @ts-ignore
import ZKLib from 'zkteco-js';
import axios from 'axios';

// --- CONFIGURATION ---
const DEVICE_IP = '192.168.1.201'; // Local Device IP
const DEVICE_PORT = 4370;
const SERVER_URL = 'http://66.116.224.221/api'; // Live VPS Backend URL
const BRIDGE_API_KEY = 'ag_bio_sync_v1_secret_key'; // Matches server .env

// ---------------------

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

let consecutiveFailures = 0;

async function sync() {
    // 1. Connect to Device
    const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 4000);
    try {
        // Robust TCP Connection
        await (zk as any).ztcp.createSocket();
        await (zk as any).ztcp.connect();
        (zk as any).connectionType = 'tcp';

        consecutiveFailures = 0; // Reset on success

        // 2. Fetch Logs
        const logsResp: any = await Promise.race([
            zk.getAttendances(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout fetching logs')), 20000))
        ]);
        const data = logsResp?.data || [];

        if (data.length === 0) {
            console.log(`[${ts()}] 💤 Device Online. No logs on device.`);
            return;
        }

        // 3. Map logs — handle ALL possible field name variations from zkteco-js
        const cleanLogs = data.map((l: any) => ({
            // Try every known field name for user identifier
            user_id: String(
                l.user_id ??  // node-zklib  (old)
                l.userId ??  // zkteco-js   (new)
                l.deviceUserId ?? // zkteco-js alternate
                l.uid ??  // fallback
                ''
            ),
            // Try every known field for timestamp
            record_time: l.recordTime || l.record_time || l.time || new Date().toISOString(),
        })).filter((l: any) => l.user_id && l.user_id !== '');

        console.log(`[${ts()}] 📤 Found ${data.length} raw logs (${cleanLogs.length} valid). Uploading...`);

        // 4. Show skipped entries warning
        const skipped = data.length - cleanLogs.length;
        if (skipped > 0) {
            console.warn(`[${ts()}] ⚠️  ${skipped} logs skipped (missing user_id). Raw sample:`, JSON.stringify(data[0]));
        }

        // 5. Upload to VPS in batches of 500
        const BATCH_SIZE = 500;
        for (let i = 0; i < cleanLogs.length; i += BATCH_SIZE) {
            const chunk = cleanLogs.slice(i, i + BATCH_SIZE);
            try {
                const resp = await axios.post(
                    `${SERVER_URL}/attendance/biometric/bridge/upload`,
                    { logs: chunk },
                    {
                        headers: {
                            'x-api-key': BRIDGE_API_KEY,
                            'Content-Type': 'application/json'
                        },
                        timeout: 15000
                    }
                );
                const msg = resp.data?.message || 'OK';
                console.log(`[${ts()}] ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${msg}`);
            } catch (apiErr: any) {
                console.error(`[${ts()}] ❌ Upload Failed (batch ${Math.floor(i / BATCH_SIZE) + 1}):`, apiErr.message);
                if (apiErr.response) console.error('  Server:', apiErr.response.status, JSON.stringify(apiErr.response.data));
            }
        }

    } catch (err: any) {
        consecutiveFailures++;
        console.error(`[${ts()}] ⚠️  Device Error (attempt #${consecutiveFailures}):`, err.message || 'Unknown');
        if (consecutiveFailures === 3) {
            console.error(`\n[${ts()}] 🔴 Device offline for 3 consecutive attempts!`);
            console.error('  Check: Is this PC on the same network as the biometric device?');
            console.error(`  Device IP: ${DEVICE_IP}:${DEVICE_PORT}\n`);
        }
    } finally {
        try { await zk.disconnect(); } catch (_) { }
    }
}

function ts() {
    return new Date().toLocaleTimeString('en-IN');
}

async function main() {
    console.log('\n===================================================');
    console.log('  Antigravity Biometric Bridge Agent');
    console.log(`  Device: ${DEVICE_IP}:${DEVICE_PORT} → ${SERVER_URL}`);
    console.log('  Sync Interval: Every 5 seconds');
    console.log('  Keep this window OPEN all day for live sync.');
    console.log('===================================================\n');

    while (true) {
        await sync();
        // Wait 30 seconds before next cycle to reduce device load
        await sleep(30000);
    }
}

main();
