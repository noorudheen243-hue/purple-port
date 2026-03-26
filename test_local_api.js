const axios = require('axios');
const http = require('http');
const https = require('https');

async function testApi() {
    try {
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'noorudheen243@gmail.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        
        const res = await axios.get('http://localhost:5000/api/team/staff?include_relieved=true&include_hidden=true', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const users = res.data;
        console.log(`Total users: ${users.length}`);
        
        const admins = users.filter(u => u.user.email.includes('admin'));
        console.log("Admin Users:");
        admins.forEach(u => console.log(`- ${u.user.email} (${u.user.role})`));
        
    } catch (err) {
        console.error(err.response ? err.response.data : err.message);
    }
}

testApi();
