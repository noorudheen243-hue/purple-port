async function testLogin() {
    try {
        console.log("Attempting login to http://127.0.0.1:4000/api/auth/login...");
        const response = await fetch('http://127.0.0.1:4000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@qixads.com',
                password: 'admin123'
            })
        });

        console.log("Status:", response.status);
        const data = await response.json();
        console.log("Data:", data);

        if (response.ok) {
            console.log("Login Success!");
        } else {
            console.log("Login Failed!");
        }
    } catch (error: any) {
        console.log("Network Error:", error.message);
    }
}

testLogin();
