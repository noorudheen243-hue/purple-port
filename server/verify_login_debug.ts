import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const debugLogin = async () => {
    console.log("--- Starting Deep Debug ---");

    const email = 'admin@qix.com';
    const password = 'password';

    // 1. Check DB
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            console.error("❌ CRTICAL: User found in DB!");
            return;
        }
        console.log("✅ User exists in DB:", user.email, user.role);

        // 2. Verify Password Hash
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            console.error("❌ CRITICAL: Password hash mismatch! Re-seeding required.");
            return;
        }
        console.log("✅ Password hash validates correctly.");

    } catch (e) {
        console.error("DB Error:", e);
        return;
    }

    // 3. Test API Endpoint
    try {
        console.log("Testing POST http://localhost:4000/api/auth/login...");
        const res = await fetch('http://localhost:4000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (res.ok) {
            const data = await res.json();
            console.log("✅ API Login Successful!");
            console.log("Response Data:", data);
        } else {
            const errText = await res.text();
            console.error("❌ API Request Failed:", res.status, errText);
        }

    } catch (error: any) {
        console.error("❌ Network Error:", error.message);
        console.error("Is the server running on port 4000?");
    }
};

debugLogin()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
