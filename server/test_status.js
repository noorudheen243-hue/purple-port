const axios = require('axios');

async function test() {
    try {
        const clientId = 'db6df8c3-0ec8-4b17-8071-e39746b8be35'; // Dr Basil
        const res = await axios.get(`http://localhost:4001/api/marketing/meta/status?clientId=${clientId}`);
        console.log('Status Result:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log('Error:', e.response?.data || e.message);
    }
}

test();
