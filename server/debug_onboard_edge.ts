
async function testEdgeCases() {
    try {
        console.log("--- Starting Edge Case Tests ---");

        // 1. Login
        const loginRes = await fetch('http://localhost:4000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@qixads.com', password: 'admin123' })
        });
        const cookie = loginRes.headers.get('set-cookie');
        const jwt = cookie ? cookie.split(';')[0] : '';
        console.log("Login Status:", loginRes.status);

        if (!loginRes.ok) return;

        // 2. Test Invalid Enum
        console.log("\n[Test 1] Invalid Department");
        const res1 = await fetch('http://localhost:4000/api/team/staff/onboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': jwt },
            body: JSON.stringify({
                full_name: "Test Enum",
                email: "test_enum@qixads.com",
                role: "ADMIN",
                staff_number: "EMP-EDGE-001",
                department: "INVALID_DEPT",  // Error Expected
                date_of_joining: new Date().toISOString()
            })
        });
        const d1 = await res1.json();
        console.log("Status:", res1.status);
        console.log("Response:", JSON.stringify(d1).substring(0, 200));

        // 3. Test Empty Strings for Optional Numbers
        console.log("\n[Test 2] Empty Strings for numbers");
        const res2 = await fetch('http://localhost:4000/api/team/staff/onboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': jwt },
            body: JSON.stringify({
                full_name: "Test Empty Num",
                email: "test_empty_num@qixads.com",
                role: "ADMIN",
                staff_number: "EMP-EDGE-002",
                department: "ADMIN",
                date_of_joining: new Date().toISOString(),
                base_salary: "", // Should coerce to 0 or null?
                total_experience_years: "" // Should coerce
            })
        });
        const d2 = await res2.json();
        console.log("Status:", res2.status);
        console.log("Response:", JSON.stringify(d2, null, 2));

        // 4. Test Missing Date
        console.log("\n[Test 3] Missing Date");
        const res3 = await fetch('http://localhost:4000/api/team/staff/onboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': jwt },
            body: JSON.stringify({
                full_name: "Test No Date",
                email: "test_no_date@qixads.com",
                role: "ADMIN",
                staff_number: "EMP-EDGE-003",
                department: "ADMIN",
                // date_of_joining missing
            })
        });
        const d3 = await res3.json();
        console.log("Status:", res3.status);
        console.log("Response:", JSON.stringify(d3, null, 2));

    } catch (e: any) {
        console.error("Script Error:", e.message);
    }
}
testEdgeCases();
