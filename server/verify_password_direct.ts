
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const EMAIL = "noorudheen243@gmail.com";
const PASSWORD_TO_TEST = "password123";

async function verify() {
    console.log(`--- DEBUGGING PASSWORD FOR ${EMAIL} ---`);
    const user = await prisma.user.findUnique({ where: { email: EMAIL } });

    if (!user) {
        console.log("❌ User not found in DB!");
        return;
    }

    console.log(`User ID: ${user.id}`);
    const currentHash = user.password_hash || '';
    console.log(`Stored Hash: ${currentHash.substring(0, 20)}...`);

    const isMatch = await bcrypt.compare(PASSWORD_TO_TEST, currentHash);
    console.log(`\nTesting 'bcrypt.compare("${PASSWORD_TO_TEST}", hash)':`);
    console.log(isMatch ? "✅ MATCH (The password IS correct)" : "❌ NO MATCH (The stored hash does not match password123)");

    if (!isMatch) {
        console.log("\nAttempting to reset it again inside this script...");
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(PASSWORD_TO_TEST, salt);
        await prisma.user.update({
            where: { id: user.id },
            data: { password_hash: newHash }
        });
        console.log("✅ Update complete. Retesting...");
        const userRefreshed = await prisma.user.findUnique({ where: { email: EMAIL } });

        if (userRefreshed && userRefreshed.password_hash) {
            const isMatchNow = await bcrypt.compare(PASSWORD_TO_TEST, userRefreshed.password_hash);
            console.log(isMatchNow ? "✅ RE-MATCH SUCCESS" : "❌ STILL FAILING (Something is weird with bcrypt)");
        } else {
            console.log("❌ Failed to fetch user after update");
        }
    }
}

verify()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
