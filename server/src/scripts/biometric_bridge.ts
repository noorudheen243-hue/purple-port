// @ts-ignore
import ZKLib from 'zkteco-js';
import axios from 'axios';

// --- CONFIGURATION ---
const DEVICE_IP = '192.168.1.201'; // Local Device IP
const DEVICE_PORT = 4370;
const SERVER_URL = 'https://qixport.com/api'; // Live VPS Backend URL
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

        // 3.5. Fetch Users too!
        let deviceUsers = [];
        try {
            const usersResp: any = await Promise.race([
                zk.getUsers(),
                new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout fetching users')), 10000))
            ]);
            deviceUsers = usersResp?.data || [];
        } catch (e: any) {
            console.warn(`[${ts()}] ⚠️  Could not fetch users:`, e.message);
        }

        // 4. Show skipped entries warning
        const skipped = data.length - cleanLogs.length;
        if (skipped > 0) {
            console.warn(`[${ts()}] ⚠️  ${skipped} logs skipped (missing user_id). Raw sample:`, JSON.stringify(data[0]));
        }

        // 4.5. Upload Users List to VPS First
        if (deviceUsers.length > 0) {
            try {
                await axios.post(
                    `${SERVER_URL}/attendance/biometric/bridge/upload-users`,
                    { users: deviceUsers },
                    {
                        headers: {
                            'x-api-key': BRIDGE_API_KEY,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    }
                );
                console.log(`[${ts()}] 👥 Uploaded ${deviceUsers.length} enrolled users to bridge cache.`);
            } catch (apiErr: any) {
                console.error(`[${ts()}] ❌ User Upload Failed:`, apiErr.message);
            }
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

async function executeRemoteCommand(cmd: any) {
    const { id, command, params: paramsStr } = cmd;
    console.log(`[${ts()}] 🤖 Executing Remote Command: ${command}...`);
    
    const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 20000, 4000);
    let status = 'SUCCESS';
    let resultJson: any = {};

    try {
        await (zk as any).ztcp.createSocket();
        await (zk as any).ztcp.connect();
        (zk as any).connectionType = 'tcp';

        const params = paramsStr ? JSON.parse(paramsStr) : {};

        switch (command) {
            case 'RESTART':
                await zk.executeCmd(8); // CMD_RESTART
                resultJson = { message: 'Restart command sent.' };
                break;
            case 'SYNC_TIME':
                await zk.setTime(new Date());
                resultJson = { message: 'Device time synchronized.' };
                break;
            case 'CLEAR_LOGS':
                await zk.clearAttendanceLog();
                resultJson = { message: 'Logs cleared successfully.' };
                break;
            case 'SET_USER':
                const uid = params.uid || (params.userId ? parseInt(params.userId.replace(/\D/g, '')) : 0);
                if (!uid) throw new Error('Missing UID for SET_USER');
                await zk.setUser(uid, params.userId, params.name, params.password || '', params.role || 0, params.cardno || 0);
                resultJson = { message: `User ${params.userId} set/updated.` };
                break;
            case 'DELETE_USER':
                const deleteUid = parseInt(params.userId.replace(/\D/g, ''));
                if (!deleteUid) throw new Error('Missing UID for DELETE_USER');
                await zk.deleteUser(deleteUid);
                resultJson = { message: `User ${params.userId} deleted.` };
                break;
            default:
                throw new Error(`Command "${command}" not implemented in bridge.`);
        }
        console.log(`[${ts()}] ✅ Command Success: ${command}`);
    } catch (e: any) {
        status = 'FAILED';
        resultJson = { error: e.message || 'Unknown device error' };
        console.error(`[${ts()}] ❌ Command Failed: ${command}`, e.message);
    } finally {
        try { await zk.disconnect(); } catch (_) { }
        
        // Report result back to server
        try {
            await axios.post(
                `${SERVER_URL}/attendance/biometric/bridge/command-result`,
                { id, status, result: JSON.stringify(resultJson) },
                {
                    headers: { 'x-api-key': BRIDGE_API_KEY },
                    timeout: 10000
                }
            );
        } catch (reportErr: any) {
            console.error(`[${ts()}] ❌ Failed to report result to server:`, reportErr.message);
        }
    }
}

async function heartbeat() {
    try {
        const resp = await axios.post(
            `${SERVER_URL}/attendance/biometric/bridge/heartbeat`,
            {},
            {
                headers: {
                    'x-api-key': BRIDGE_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        const commands = resp.data?.commands || [];
        if (commands.length > 0) {
            console.log(`[${ts()}] 📥 Heartbeat: Found ${commands.length} pending commands.`);
            for (const cmd of commands) {
                await executeRemoteCommand(cmd);
            }
        } else {
            // console.log(`[${ts()}] 💓 Heartbeat: Alive.`);
        }
    } catch (e: any) {
        console.error(`[${ts()}] 💔 Heartbeat failed:`, e.message);
    }
}

function ts() {
    return new Date().toLocaleTimeString('en-IN');
}

async function main() {
    console.log('\n===================================================');
    console.log('  Antigravity Biometric Bridge Agent (v2.0)');
    console.log(`  Target Device: ${DEVICE_IP}:${DEVICE_PORT}`);
    console.log(`  Source Server: ${SERVER_URL}`);
    console.log('  Mode: Bidirectional (Sync + Remote Management)');
    console.log('===================================================\n');

    while (true) {
        // 1. Send Heartbeat and Process Remote Commands
        await heartbeat();

        // 2. Sync Logs
        await sync();

        // Wait 30 seconds before next cycle
        await sleep(30000);
    }
}

main();
