
const axios = require('axios');

async function testLogin() {
    try {
        const response = await axios.post('http://localhost:4001/api/auth/login', {
            email: 'noorudheen243@gmail.com',
            password: 'password123'
        });
        console.log('Login Success:', response.status);
        console.log('Response Data:', response.data);
    } catch (error) {
        console.error('Login Failed:', error.response ? error.response.status : error.message);
        if (error.response) {
            console.error('Error Data:', error.response.data);
        }
    }
}

testLogin();
