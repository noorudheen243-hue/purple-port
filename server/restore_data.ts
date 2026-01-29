import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    console.log("🚑 Starting Data Restoration...");

    // Check for individual backup files
    const hasIndividualFiles = fs.existsSync('users.json') && fs.existsSync('clients.json');
    let users = [];
    let clients = [];
    let staff = [];

    if (hasIndividualFiles) {
        console.log("📂 Found individual backup files (users.json, clients.json, etc.)");
        try {
            if (fs.existsSync('users.json')) users = JSON.parse(fs.readFileSync('users.json', 'utf-8'));
            if (fs.existsSync('clients.json')) clients = JSON.parse(fs.readFileSync('clients.json', 'utf-8'));
            if (fs.existsSync('staffProfiles.json')) staff = JSON.parse(fs.readFileSync('staffProfiles.json', 'utf-8'));
        } catch (e) {
            console.error("❌ Failed to parse backup files:", (e as Error).message);
        }
    } else if (fs.existsSync('rescued_data.json')) {
        console.log("📂 Found 'rescued_data.json'");
        const raw = fs.readFileSync('rescued_data.json', 'utf-8');
        const data = JSON.parse(raw);
        users = data.users || [];
        clients = data.clients || [];
        staff = data.staff || [];
    } else {
        console.error("❌ No backup files found! (Looking for users.json or rescued_data.json)");
        return;
    }

    // 1. Restore Users (Base ID, Auth, Roles)
    console.log(`\n🔄 Restoring ${users.length} Users...`);
    for (const user of users) {
        try {
            const { id, email, password_hash, full_name, role, department, createdAt, updatedAt } = user;
            await prisma.user.upsert({
                where: { id },
                update: {},
                create: { id, email, password_hash, full_name, role, department, createdAt: new Date(createdAt), updatedAt: new Date(updatedAt) }
            });
        } catch (e) {
            console.error(`Skipped User ${user.email}:`, (e as Error).message);
        }
    }

    // 2. Restore Clients (Entities)
    console.log(`\n🔄 Restoring ${clients.length} Clients...`);
    for (const client of clients) {
        try {
            const { id, name, status, account_manager_id, client_code } = client;
            await prisma.client.upsert({
                where: { id },
                update: {},
                create: {
                    id,
                    name,
                    status,
                    client_code,
                    account_manager_id: account_manager_id || undefined
                }
            });
        } catch (e) {
            console.error(`Skipped Client ${client.name}:`, (e as Error).message);
        }
    }

    // 3. Restore Staff Profiles (HR Data)
    console.log(`\n🔄 Restoring ${staff.length} Staff Profiles...`);
    for (const s of staff) {
        try {
            const { id, user_id, staff_number, designation, department, date_of_joining } = s;
            await prisma.staffProfile.upsert({
                where: { id },
                update: {},
                create: {
                    id,
                    user_id,
                    staff_number,
                    designation,
                    department,
                    date_of_joining: new Date(date_of_joining)
                }
            });
        } catch (e) {
            console.error(`Skipped Staff ${s.staff_number}:`, (e as Error).message);
        }
    }

    console.log("\n✅ Restoration Complete!");
    console.log("👉 Financial Data has been reset (Fresh Start).");
    console.log("👉 Users and Clients are back.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
