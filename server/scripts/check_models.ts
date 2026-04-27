import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
dotenv.config();

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API key found in .env");
        return;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        console.log("Fetching models...");
        // This is a bit tricky with the SDK, but we can try to use a dummy call or check the SDK capabilities
        // Actually, let's just try to generate a tiny thing with different model names
        const names = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro", "gemini-1.5-pro"];
        for (const name of names) {
            try {
                const model = genAI.getGenerativeModel({ model: name });
                const result = await model.generateContent("hi");
                console.log(`[SUCCESS] Model '${name}' is available.`);
            } catch (err: any) {
                console.error(`[FAILURE] Model '${name}' failed: ${err.message}`);
            }
        }
    } catch (e: any) {
        console.error("Global Error:", e.message);
    }
}

listModels();
