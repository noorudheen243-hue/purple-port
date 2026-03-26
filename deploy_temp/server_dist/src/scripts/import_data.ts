
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function importData() {
    console.log('>>> IMPORTING DATA TO POSTGRESQL...');

    const dataPath = path.join(__dirname, '../../data_backup.json');
    if (!fs.existsSync(dataPath)) {
        throw new Error("data_backup.json not found!");
    }
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    // Helper to clean tables
    const deleteParams = { where: {} }; // Delete all

    console.log('--- Cleaning Old Data ---');
    // Delete in reverse dependency order
    await prisma.timeLog.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.task.deleteMany();

    await prisma.invoiceItem.deleteMany();
    // await prisma.item.deleteMany().catch(() => { }); // Legacy removed
    await prisma.invoice.deleteMany();

    await prisma.journalLine.deleteMany();
    await prisma.journalEntry.deleteMany();
    await prisma.ledger.deleteMany();
    await prisma.accountHead.deleteMany();

    await prisma.campaign.deleteMany();
    await prisma.client.deleteMany();

    await prisma.staffProfile.deleteMany();
    await prisma.user.deleteMany();

    console.log('--- Inserting New Data ---');

    // 1. Users (Use CreateMany)
    if (data.users?.length) {
        await prisma.user.createMany({ data: data.users });
        console.log(`+ Imported ${data.users.length} Users`);
    }

    // 2. Staff
    if (data.staffProfiles?.length) {
        // Remove empty relations if any
        const validProfiles = data.staffProfiles.map((p: any) => {
            const { id, ...rest } = p; // Keep ID if UUIDs match, typically yes
            return p;
        });
        await prisma.staffProfile.createMany({ data: validProfiles });
        console.log(`+ Imported ${validProfiles.length} Staff Profiles`);
    }

    // 3. Accounting Heads
    if (data.accountHeads?.length) {
        await prisma.accountHead.createMany({ data: data.accountHeads });
        console.log(`+ Imported ${data.accountHeads.length} Account Heads`);
    }

    // 4. Clients
    if (data.clients?.length) {
        await prisma.client.createMany({ data: data.clients });
        console.log(`+ Imported ${data.clients.length} Clients`);
    }

    // 5. Campaigns
    if (data.campaigns?.length) {
        await prisma.campaign.createMany({ data: data.campaigns });
        console.log(`+ Imported ${data.campaigns.length} Campaigns`);
    }

    // 6. Tasks
    if (data.tasks?.length) {
        await prisma.task.createMany({ data: data.tasks });
        console.log(`+ Imported ${data.tasks.length} Tasks`);
    }

    // ... Add others as needed. For MVP/Rescue this covers the core.

    console.log('>>> SUCCESS! Data Migration Complete.');
}

importData()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => await prisma.$disconnect());
