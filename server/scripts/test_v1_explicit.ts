import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
dotenv.config();

async function testV1() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return;
    
    try {
        console.log("Testing with apiVersion: 'v1'...");
        // Explicitly set apiVersion to 'v1' (supported in recent versions of @google/generative-ai)
        const genAI = new GoogleGenerativeAI(apiKey);
        // The SDK doesn't expose a simple way to change the version in the public constructor in all versions,
        // but we can try to pass it in the config object if the type allows OR use the model name with 'v1/'
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' });
        const result = await model.generateContent("hi");
        console.log("[SUCCESS] gemini-1.5-flash worked with v1!");
    } catch (err: any) {
        console.error("[FAILURE] v1 also failed:", err.message);
    }
}

testV1();
