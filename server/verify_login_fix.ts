
import axios from 'axios';

async function testLoginFix() {
    const API_URL = 'http://localhost:4001/api/auth/login';

    // Test Case: Input with Uppercase and Spaces (Mocking User Input)
    const messyEmail = "  NOORUDHEEN243@GMAIL.COM  ";
    const messyPassword = "  password123  ";

    console.log(`Testing Login with Messy Input:`);
    console.log(`Email: '${messyEmail}'`);
    console.log(`Password: '${messyPassword}'`);

    try {
        const response = await axios.post(API_URL, {
            email: messyEmail,
            password: messyPassword
        });

        console.log("\n✅ Login SUCCESS!");
        console.log("Server returned:", response.data);
    } catch (error: any) {
        console.log("\n❌ Login FAILED!");
        if (error.response) {
            console.log("Status:", error.response.status);
            console.log("Message:", error.response.data);
        } else {
            console.log("Error:", error.message);
        }
    }
}

testLoginFix();
