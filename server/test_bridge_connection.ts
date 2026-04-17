
import axios from 'axios';

const SERVER_URL = 'https://qixport.com/api';
const BRIDGE_API_KEY = 'ag_bio_sync_v1_secret_key';

async function test() {
    console.log(`Testing connection to ${SERVER_URL}/attendance/biometric/bridge/heartbeat ...`);
    try {
        const resp = await axios.post(
            `${SERVER_URL}/attendance/biometric/bridge/heartbeat`,
            {},
            {
                headers: { 'x-api-key': BRIDGE_API_KEY },
                timeout: 10000
            }
        );
        console.log('✅ Connection Successful!');
        console.log('Server Response:', JSON.stringify(resp.data, null, 2));
    } catch (e: any) {
        console.error('❌ Connection Failed!');
        if (e.response) {
            console.error(`Status: ${e.response.status}`);
            console.error('Data:', JSON.stringify(e.response.data, null, 2));
        } else {
            console.error('Error:', e.message);
        }
    }
}

test();
