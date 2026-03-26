
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

async function testUploadAndFetch() {
    try {
        // 0. Login
        console.log('0. Logging in...');
        const loginRes = await axios.post('http://localhost:4001/api/auth/login', {
            email: 'admin@example.com',
            password: 'admin123'
        });
        const token = loginRes.data.token;
        console.log('Login Success. Token acquired.');

        // 1. Prepare File
        // Try multiple paths to find the image
        let filePath = path.join(process.cwd().replace('server', 'client'), 'public', 'qix_logo.png');
        if (!fs.existsSync(filePath)) {
            // Fallback for different CWD structure
            filePath = path.join(process.cwd(), '../client/public/qix_logo.png');
        }

        if (!fs.existsSync(filePath)) {
            console.error('Source file not found:', filePath);
            console.error('CWD:', process.cwd());
            // List dir to help debug
            const clientPublic = path.join(process.cwd(), '../client/public');
            if (fs.existsSync(clientPublic)) {
                console.log(`Contents of ${clientPublic}:`, fs.readdirSync(clientPublic));
            }
            return;
        }

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));

        console.log('1. Uploading file...');
        const uploadRes = await axios.post('http://localhost:4001/api/upload', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Upload Success:', uploadRes.status);
        console.log('Response:', uploadRes.data);

        const fileUrl = uploadRes.data.url; // /uploads/filename
        const fullUrl = `http://localhost:4001/api${fileUrl}`;

        console.log(`2. Fetching uploaded file from: ${fullUrl}`);
        const getRes = await axios.get(fullUrl);

        console.log('Fetch Success:', getRes.status);
        if (getRes.headers['content-type']) {
            console.log('Content-Type:', getRes.headers['content-type']);
        }
        console.log('Verification: The system is working correctly for NEW uploads.');

    } catch (err: any) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Response Status:', err.response.status);
            console.error('Response Data:', err.response.data);
        }
    }
}

testUploadAndFetch();
