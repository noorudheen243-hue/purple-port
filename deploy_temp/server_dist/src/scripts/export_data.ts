
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function exportData() {
    console.log('>>> EXPORTING DATA FROM LOCAL DATABASE...');
    const data: any = {};

    // 1. Users & Staff
    data.users = await prisma.user.findMany();
    data.staffProfiles = await prisma.staffProfile.findMany();

    // 2. Clients & Campaigns
    data.clients = await prisma.client.findMany();
    data.campaigns = await prisma.campaign.findMany();

    // 3. Tasks & Assets
    data.tasks = await prisma.task.findMany();
    data.assets = await prisma.asset.findMany();
    data.comments = await prisma.comment.findMany();
    data.timeLogs = await prisma.timeLog.findMany();

    // 4. Accounting
    data.accountHeads = await prisma.accountHead.findMany();
    data.ledgers = await prisma.ledger.findMany();
    data.journalEntries = await prisma.journalEntry.findMany();
    data.journalLines = await prisma.journalLine.findMany();
    data.invoices = await prisma.invoice.findMany();
    data.invoiceItems = await prisma.invoiceItem.findMany();

    // 5. Save to File
    const outputPath = path.join(__dirname, '../../data_backup.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

    console.log(`>>> SUCCESS! Exported ${Object.keys(data).length} tables to data_backup.json`);
    console.log(`    Users: ${data.users.length}`);
    console.log(`    Tasks: ${data.tasks.length}`);
}

exportData()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
