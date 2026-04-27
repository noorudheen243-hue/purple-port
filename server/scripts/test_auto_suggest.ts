import axios from 'axios';

async function testAutoSuggest() {
    const clientId = "d0542586-bbec-43b9-be2c-b5c7ebb79741"; // The client from subagent test
    const url = `http://localhost:4001/api/marketing/strategy/${clientId}/auto-suggest`;
    
    try {
        console.log(`Pinging ${url}...`);
        const response = await axios.post(url, { step: 'MARKET' });
        console.log("Success:", JSON.stringify(response.data, null, 2));
    } catch (error: any) {
        if (error.response) {
            console.error("Error Status:", error.response.status);
            console.error("Error Body:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Error Message:", error.message);
        }
    }
}

testAutoSuggest();
