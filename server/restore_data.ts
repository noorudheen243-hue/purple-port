import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    console.log("🚑 Starting Data Restoration...");

    if (!fs.existsSync('rescued_data.json')) {
        console.error("❌ 'rescued_data.json' not found! Run rescue_data.ts first.");
        return;
    }

    const raw = fs.readFileSync('rescued_data.json', 'utf-8');
    const data = JSON.parse(raw);

    // 1. Restore Users (Base ID, Auth, Roles)
    console.log(`\n🔄 Restoring ${data.users?.length || 0} Users...`);
    if (data.users) {
        for (const user of data.users) {
            try {
                // Remove relations that might break insert (like created_invoices if fetched incorrectly)
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
    }

    // 2. Restore Clients (Entities)
    console.log(`\n🔄 Restoring ${data.clients?.length || 0} Clients...`);
    if (data.clients) {
        for (const client of data.clients) {
            try {
                // Minimal restore to avoid self-relation loops, ignoring complex JSONs if they cause issues
                const { id, name, status, account_manager_id } = client;

                await prisma.client.upsert({
                    where: { id },
                    update: {},
                    create: {
                        id,
                        name,
                        status,
                        // Only link manager if it exists (which we just restored)
                        account_manager_id: account_manager_id || undefined
                    }
                });
            } catch (e) {
                console.error(`Skipped Client ${client.name}:`, (e as Error).message);
            }
        }
    }

    // 3. Restore Staff Profiles (HR Data)
    console.log(`\n🔄 Restoring ${data.staff?.length || 0} Staff Profiles...`);
    if (data.staff) {
        for (const staff of data.staff) {
            try {
                const { id, user_id, staff_number, designation, department, date_of_joining } = staff;

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
                console.error(`Skipped Staff ${staff.staff_number}:`, (e as Error).message);
            }
        }
    }

    console.log("\n✅ Restoration Complete!");
    console.log("👉 Financial Data has been reset (Fresh Start).");
    console.log("👉 Users and Clients are back.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
