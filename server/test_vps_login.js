const axios = require('axios');

async function testLogin() {
    try {
        console.log('Attempting login on localhost:4001...');
        const response = await axios.post('http://localhost:4001/api/auth/login', {
            email: 'noorudheen243@gmail.com',
            password: 'wrongpassword'
        });
        console.log('Response:', response.status, response.data);
    } catch (error) {
        if (error.response) {
            console.log('Error Response:', error.response.status, error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testLogin();
