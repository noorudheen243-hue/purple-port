const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
    try {
        console.log("Listing models...");
        // listModels is not directly on genAI in some versions of SDK, 
        // it might be on a different client or needs different approach.
        // Actually, let's try calling a model that is definitely old: gemini-pro (already failed).
        
        // Let's try forcing the API version to v1 in the URL if we can 
        // but the SDK doesn't expose it easily.
        
        // Wait! Let's try to fetch with a simple fetch request to see what happens.
        const axios = require('axios');
        const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
        const response = await axios.get(url);
        console.log("Available models from v1:");
        console.log(response.data.models.map(m => m.name).join(", "));
    } catch (e) {
        console.error("Failed to list models:", e.response?.data || e.message);
    }
}

test();
