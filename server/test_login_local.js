
const axios = require('axios');

const LOGIN_URL = 'http://localhost:4001/api/auth/login';
const CREDENTIALS = {
    email: 'noorudheen243@gmail.com',
    password: 'password123'
};

async function testLogin() {
    console.log(`Testing Login against: ${LOGIN_URL}`);
    try {
        const response = await axios.post(LOGIN_URL, CREDENTIALS, {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true
        });

        console.log('✅ LOGIN SUCCESS!');
        console.log('User:', response.data.email);
        console.log('Role:', response.data.role);

        const cookies = response.headers['set-cookie'];
        if (cookies) {
            console.log('✅ Cookies received:', cookies);
        } else {
            console.log('⚠️ No cookies received (Check CORS/Secure settings)');
        }

    } catch (error) {
        console.error('❌ LOGIN FAILED');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', error.response.data);
            console.error('Headers:', error.response.headers);
        } else {
            console.error(error.message);
        }
    }
}

testLogin();
