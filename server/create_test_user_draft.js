const axios = require('axios');

async function createTestUser() {
    try {
        const response = await axios.post('http://localhost:4000/api/team/staff/onboard', {
            full_name: "Test Delete Me",
            email: "test.delete@example.com",
            role: "WEB_SEO_EXECUTIVE",
            department: "WEB_SEO",
            staff_number: "TEST001",
            designation: "Tester",
            date_of_joining: new Date(),
            // Optional but good to have
            base_salary: 10000
        }, {
            headers: {
                // Assuming we need cookies or auth. 
                // Wait, this script runs outside browser context. 
                // I need a valid session cookie or I can temporarily disable auth? 
                // OR I can just login first in the script?
            },
            withCredentials: true // Axios in node doesn't auto-handle cookies like browser
        });
        console.log("User Created:", response.data);
    } catch (error) {
        console.error("Error creating user:", error.response ? error.response.data : error.message);
    }
}

// Actually, doing this via browser console inside the subagent is easier because it has the Auth Cookie!
// I will skip this file and do it in the browser.
