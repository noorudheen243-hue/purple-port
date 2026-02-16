import axios from 'axios';

async function testCleanup() {
    try {
        // First, let's get your actual user credentials to test with
        const response = await axios.post('http://localhost:4001/api/system/cleanup-assets', {
            password: 'test123'  // Replace with your actual password
        }, {
            headers: {
                'Cookie': 'your-session-cookie-here'  // You'll need to get this from browser
            }
        });

        console.log('✅ SUCCESS:', response.data);
    } catch (error: any) {
        console.error('❌ ERROR:', {
            status: error.response?.status,
            message: error.response?.data?.message,
            error: error.response?.data?.error,
            fullError: error.response?.data
        });
    }
}

testCleanup();
