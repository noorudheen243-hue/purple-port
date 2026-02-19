/**
 * Push today's punch logs from local biometric device → VPS
 * Run: npx ts-node scripts/push_to_vps.ts
 */
// @ts-ignore
import ZKLib from 'zkteco-js';
import axios from 'axios';

const DEVICE_IP = '192.168.1.201';
const DEVICE_PORT = 4370;
const SERVER_URL = 'http://66.116.224.221/api';
const API_KEY = 'ag_bio_sync_v1_secret_key';

async function main() {
    console.log('[PushToVPS] Connecting to device...');
    const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 4000);

    try {
        await (zk as any).ztcp.createSocket();
        await (zk as any).ztcp.connect();
        (zk as any).connectionType = 'tcp';
        console.log('[PushToVPS] Device connected!');

        const logsResp: any = await Promise.race([
            zk.getAttendances(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), 20000))
        ]);

        const allLogs: any[] = logsResp?.data || [];
        console.log(`[PushToVPS] Total logs on device: ${allLogs.length}`);

        // Parse today's date in IST
        const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
        const todayStr = nowIST.toISOString().split('T')[0]; // YYYY-MM-DD

        // Filter today's logs
        const todayLogs = allLogs.filter((l: any) => {
            const t = l.record_time || l.recordTime;
            if (!t) return false;
            const logIST = new Date(new Date(t).getTime() + 5.5 * 60 * 60 * 1000);
            return logIST.toISOString().startsWith(todayStr);
        });

        console.log(`[PushToVPS] Today's logs (${todayStr} IST): ${todayLogs.length}`);

        if (todayLogs.length === 0) {
            console.log('[PushToVPS] No punches today to push.');
            return;
        }

        // Format for API
        const payload = todayLogs.map((l: any) => ({
            user_id: String(l.user_id || l.userId || l.deviceUserId || l.uid || ''),
            record_time: l.record_time || l.recordTime,
        })).filter((l: any) => l.user_id);

        console.log(`[PushToVPS] Sending ${payload.length} logs to VPS...`);
        console.log('[PushToVPS] Punches:');
        payload.forEach(l => {
            const t = new Date(new Date(l.record_time).getTime() + 5.5 * 60 * 60 * 1000);
            console.log(`   ${l.user_id} → ${t.toLocaleTimeString('en-IN')} IST`);
        });

        const resp = await axios.post(
            `${SERVER_URL}/attendance/biometric/bridge/upload`,
            { logs: payload },
            {
                headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
                timeout: 30000
            }
        );

        const data = resp.data;
        console.log(`\n✅ VPS Sync Complete!`);
        console.log(`   Success : ${data?.details?.success ?? 'N/A'}`);
        console.log(`   Failed  : ${data?.details?.failed ?? 'N/A'}`);
        if (data?.details?.errors?.length) {
            console.log('   Errors  :');
            data.details.errors.forEach((e: string) => console.log(`     - ${e}`));
        }
    } catch (e: any) {
        console.error('[PushToVPS] Error:', e.message);
        if (e.response) console.error('  VPS Response:', e.response.status, JSON.stringify(e.response.data));
    } finally {
        try { await zk.disconnect(); } catch (_) { }
    }
}

main();
