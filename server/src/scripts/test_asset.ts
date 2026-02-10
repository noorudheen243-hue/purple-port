
import axios from 'axios';

async function testAsset() {
    try {
        const url = 'http://localhost:4001/api/uploads/test.txt'; // We might need to find a real file
        console.log(`Fetching ${url}...`);
        const res = await axios.get(url);
        console.log('Status:', res.status);
        console.log('Headers:', res.headers);
    } catch (err: any) {
        console.error('Error fetching asset:', err.message);
        if (err.response) {
            console.error('Response Status:', err.response.status);
        }
    }
}

testAsset();
