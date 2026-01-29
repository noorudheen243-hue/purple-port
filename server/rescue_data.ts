import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    console.log("🚑 Starting Data Rescue Operation...");

    const data: any = {};

    // 1. Rescue Users
    try {
        console.log("Attempting to read Users...");
        data.users = await prisma.user.findMany();
        console.log(`✅ Rescued ${data.users.length} Users.`);
    } catch (e) {
        console.error("❌ Failed to read Users:", (e as Error).message);
    }

    // 2. Rescue Staff Profiles
    try {
        console.log("Attempting to read Staff Profiles...");
        data.staff = await prisma.staffProfile.findMany();
        console.log(`✅ Rescued ${data.staff.length} Staff Profiles.`);
    } catch (e) {
        console.error("❌ Failed to read Staff Profiles:", (e as Error).message);
    }

    // 3. Rescue Clients
    try {
        console.log("Attempting to read Clients...");
        data.clients = await prisma.client.findMany();
        console.log(`✅ Rescued ${data.clients.length} Clients.`);
    } catch (e) {
        console.error("❌ Failed to read Clients:", (e as Error).message);
    }

    // Save to file
    fs.writeFileSync('rescued_data.json', JSON.stringify(data, null, 2));
    console.log("\n📦 Data saved to 'rescued_data.json'");
    console.log("👉 If this file contains your data, you are safe to reset the DB.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
