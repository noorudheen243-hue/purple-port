const axios = require('axios');

async function testLoginSuccess() {
    try {
        console.log('Attempting correct login on localhost:4001...');
        const response = await axios.post('http://localhost:4001/api/auth/login', {
            email: 'noorudheen243@gmail.com',
            password: 'password123'
        });
        console.log('Login SUCCESS:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));
        console.log('Set-Cookie:', response.headers['set-cookie']);
    } catch (error) {
        if (error.response) {
            console.log('Login FAILED (Response):', error.response.status, error.response.data);
        } else {
            console.error('Login ERROR (No Response):', error.message);
        }
    }
}

testLoginSuccess();
