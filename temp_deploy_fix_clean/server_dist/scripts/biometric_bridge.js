"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore
const zkteco_js_1 = __importDefault(require("zkteco-js"));
const axios_1 = __importDefault(require("axios"));
// --- CONFIGURATION ---
const DEVICE_IP = '192.168.1.201'; // Local Device IP
const DEVICE_PORT = 4370;
const SERVER_URL = 'http://66.116.224.221/api'; // Live VPS Backend URL
const BRIDGE_API_KEY = 'ag_bio_sync_v1_secret_key'; // Matches server .env
// ---------------------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let consecutiveFailures = 0;
function sync() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        // 1. Connect to Device
        const zk = new zkteco_js_1.default(DEVICE_IP, DEVICE_PORT, 10000, 4000);
        try {
            // Robust TCP Connection
            yield zk.ztcp.createSocket();
            yield zk.ztcp.connect();
            zk.connectionType = 'tcp';
            consecutiveFailures = 0; // Reset on success
            // 2. Fetch Logs
            const logsResp = yield Promise.race([
                zk.getAttendances(),
                new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout fetching logs')), 20000))
            ]);
            const data = (logsResp === null || logsResp === void 0 ? void 0 : logsResp.data) || [];
            if (data.length === 0) {
                console.log(`[${ts()}] 💤 Device Online. No logs on device.`);
                return;
            }
            // 3. Map logs — handle ALL possible field name variations from zkteco-js
            const cleanLogs = data.map((l) => {
                var _a, _b, _c, _d;
                return ({
                    // Try every known field name for user identifier
                    user_id: String((_d = (_c = (_b = (_a = l.user_id) !== null && _a !== void 0 ? _a : l.userId) !== null && _b !== void 0 ? _b : l.deviceUserId) !== null && _c !== void 0 ? _c : l.uid) !== null && _d !== void 0 ? _d : ''),
                    // Try every known field for timestamp
                    record_time: l.recordTime || l.record_time || l.time || new Date().toISOString(),
                });
            }).filter((l) => l.user_id && l.user_id !== '');
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
                    const resp = yield axios_1.default.post(`${SERVER_URL}/attendance/biometric/bridge/upload`, { logs: chunk }, {
                        headers: {
                            'x-api-key': BRIDGE_API_KEY,
                            'Content-Type': 'application/json'
                        },
                        timeout: 15000
                    });
                    const msg = ((_a = resp.data) === null || _a === void 0 ? void 0 : _a.message) || 'OK';
                    console.log(`[${ts()}] ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${msg}`);
                }
                catch (apiErr) {
                    console.error(`[${ts()}] ❌ Upload Failed (batch ${Math.floor(i / BATCH_SIZE) + 1}):`, apiErr.message);
                    if (apiErr.response)
                        console.error('  Server:', apiErr.response.status, JSON.stringify(apiErr.response.data));
                }
            }
        }
        catch (err) {
            consecutiveFailures++;
            console.error(`[${ts()}] ⚠️  Device Error (attempt #${consecutiveFailures}):`, err.message || 'Unknown');
            if (consecutiveFailures === 3) {
                console.error(`\n[${ts()}] 🔴 Device offline for 3 consecutive attempts!`);
                console.error('  Check: Is this PC on the same network as the biometric device?');
                console.error(`  Device IP: ${DEVICE_IP}:${DEVICE_PORT}\n`);
            }
        }
        finally {
            try {
                yield zk.disconnect();
            }
            catch (_) { }
        }
    });
}
function ts() {
    return new Date().toLocaleTimeString('en-IN');
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\n===================================================');
        console.log('  Antigravity Biometric Bridge Agent');
        console.log(`  Device: ${DEVICE_IP}:${DEVICE_PORT} → ${SERVER_URL}`);
        console.log('  Sync Interval: Every 5 seconds');
        console.log('  Keep this window OPEN all day for live sync.');
        console.log('===================================================\n');
        while (true) {
            yield sync();
            // Wait 30 seconds before next cycle to reduce device load
            yield sleep(30000);
        }
    });
}
main();
