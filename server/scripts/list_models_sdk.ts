import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
dotenv.config();

async function listAllModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return;
    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        console.log("Listing models via SDK...");
        // In the latest SDK, listing models is actually done via a separate client or by iterating
        // But we can just try to see if there's a listModels method (it was renamed or removed in some versions)
        // Actually, listing models usually requires a different authentication flow (OAuth) or highly privileged API Keys.
        
        // Let's try one more guessing: 'gemini-1.0-pro'
        const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
        const result = await model.generateContent("hi");
        console.log("Success with gemini-1.0-pro");
    } catch (err: any) {
        console.error("Error:", err.message);
    }
}

listAllModels();
