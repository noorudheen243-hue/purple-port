
async function testOnboard() {
    try {
        console.log("Attempting to onboard user...");
        const response = await fetch('http://localhost:4000/api/team/staff/onboard', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add Admin Cookie or Mock Auth?
                // The route is protected: router.post('/staff/onboard', protect, authorize('ADMIN'), ...);
                // I need a valid token.
                // Alternative: I'll use the service directly if I can import it, OR login as admin first.
            },
            body: JSON.stringify({
                full_name: "Noorudheen",
                email: "nooru243@gmail.com", // Unique
                role: "ADMIN",
                staff_number: "EMP-999", // Random
                department: "ADMIN", // Valid enum
                designation: "Administrator",
                date_of_joining: new Date().toISOString(),
                base_salary: 10000,
                // Optional fields as per default/empty in frontend
                reporting_manager_id: "",
                personal_email: "",
                personal_contact: "",
                official_contact: "",
                password: "password123"
            })
        });

        // To make this work, I need a token.
        // Let's first login as admin.
        const loginRes = await fetch('http://localhost:4000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@qixads.com', password: 'admin123' })
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error("Admin login failed: " + JSON.stringify(loginData));

        const cookie = loginRes.headers.get('set-cookie');

        console.log("Logged in as Admin. Cookie:", cookie);

        // Now Onboard
        // Note: fetch in Node doesn't automatically save cookies.
        // I need to manually pass the cookie logic or just modify the script to use axios with cookie jar or manual header.
        // But wait, the server uses `req.cookies.jwt`.
        // I need to extract `jwt=...` from Set-Cookie and pass it in `Cookie` header.

        const jwt = cookie ? cookie.split(';')[0] : '';

        const onboardRes = await fetch('http://localhost:4000/api/team/staff/onboard', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': jwt
            },
            body: JSON.stringify({
                full_name: "Noorudheen",
                email: "nooru243@gmail.com",
                role: "ADMIN",
                staff_number: "EMP-TEST-001",
                department: "ADMIN",
                designation: "Test Admin",
                date_of_joining: new Date().toISOString(),
                base_salary: 10000,
                reporting_manager_id: "",
                password: "password123"
            })
        });

        const data = await onboardRes.json();
        console.log("Status:", onboardRes.status);
        console.log("Response:", JSON.stringify(data, null, 2));

    } catch (error: any) {
        console.error("Error:", error.message);
    }
}

testOnboard();
