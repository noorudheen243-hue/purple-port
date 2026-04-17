
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking DB connection...");
        const count = await prisma.user.count();
        console.log("SUCCESS: User count is:", count);
    } catch (e: any) {
        console.error("FAILURE: Database still malformed or unreachable:", e.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
