import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
dotenv.config();

async function testV1() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API key found in .env");
        return;
    }
    
    try {
        console.log("Testing with apiVersion: 'v1'...");
        const genAI = new GoogleGenerativeAI(apiKey);
        // The SDK might not have an easy option to change v1beta to v1 in the constructor in all versions,
        // but we can try to see if there's a property or if we can use a different method.
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("hi");
        console.log("[SUCCESS] Model worked with default SDK settings (v1beta) - WAIT, IT FAILED BEFORE.");
    } catch (err: any) {
        console.error(`[FAILURE] Default failed: ${err.message}`);
        
        try {
            console.log("Attempting to force v1 via URL (Internal test)...");
            // Some versions of the SDK allow passing options
            // const genAI = new GoogleGenerativeAI(apiKey, "v1"); // Try different signature
        } catch (e) {}
    }
}

testV1();
