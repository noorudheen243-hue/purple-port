
const axios = require('axios');

async function testLogs() {
    try {
        const url = 'http://66.116.224.221:4001/api/client-portal/activity-logs?teamView=DM';
        console.log(`Calling ${url}...`);
        const response = await axios.get(url);
        console.log('Response received. Items:', response.data.length);
        if (response.data.length > 0) {
            console.log('Sample data:', JSON.stringify(response.data[0], null, 2));
            const types = [...new Set(response.data.map(i => i.type))];
            console.log('Available types in response:', types);
        }
    } catch (error) {
        console.error('Error calling endpoint:', error.message);
    }
}

testLogs();
