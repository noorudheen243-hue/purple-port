process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Bypass self-signed certs just in case
const axios = require('axios');

async function testApi() {
    try {
        const loginRes = await axios.post('https://66.116.224.221/api/auth/login', {
            email: 'noorudheen243@gmail.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        
        const res = await axios.get('https://66.116.224.221/api/team/staff?include_relieved=true&include_hidden=true', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const users = res.data;
        console.log(`Total users returned from API: ${users.length}`);
        
        const admins = users.filter(u => u.user.email.includes('admin') || u.user.email.includes('qix'));
        console.log("Admin Users in API response:");
        admins.forEach(u => console.log(`- ${u.user.email} (${u.user.role})`));
        
    } catch (err) {
        console.error(err.response ? err.response.data : err.message);
    }
}

testApi();
