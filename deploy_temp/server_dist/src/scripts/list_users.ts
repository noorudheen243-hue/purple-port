
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- SYSTEM USERS REPORT ---');
    try {
        const users = await prisma.user.findMany();
        if (users.length === 0) {
            console.log("!!! DATABASE IS EMPTY !!! (No users found)");
        } else {
            console.table(users.map(u => ({
                Email: u.email,
                Role: u.role,
                PasswordHash: u.password_hash.substring(0, 10) + '...'
            })));
        }
    } catch (e) {
        console.error("Error connecting to database:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
