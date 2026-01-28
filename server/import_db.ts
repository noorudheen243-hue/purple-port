
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function importData() {
    console.log("🚀 Starting Data Import...");

    const filePath = path.join(__dirname, 'full_backup.json');
    if (!fs.existsSync(filePath)) {
        console.error("❌ full_backup.json not found!");
        return;
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(rawData);

    // Helpers
    const clean = (item: any) => {
        // Remove IDs if you want DB to generate them? NO, we must keep IDs to maintain relations.
        // We just need to handle BigInts back if needed, but Prisma takes strings for BigInt inputs usually okay? 
        // actually Prisma might complain if we pass string to BigInt field.
        // Let's assume standard fields.
        return item;
    };

    try {
        // --- 1. Users & Auth ---
        console.log("Importing Users...");
        for (const u of data.users) await prisma.user.create({ data: u }).catch(e => console.log(`Skipping User ${u.email}: Exists`));

        console.log("Importing StaffProfiles...");
        for (const s of data.staffProfiles) await prisma.staffProfile.create({ data: s }).catch(e => console.log(`Skipping Staff ${s.staff_number}`));

        // --- 2. Core Entities ---
        console.log("Importing AccountHeads...");
        for (const a of data.accountHeads) await prisma.accountHead.create({ data: a }).catch(e => { });

        console.log("Importing Clients...");
        for (const c of data.clients) await prisma.client.create({ data: c }).catch(e => console.log(`Skipping Client ${c.name}`));

        // --- 3. Projects ---
        console.log("Importing Campaigns...");
        for (const c of data.campaigns) await prisma.campaign.create({ data: c }).catch(e => { });

        console.log("Importing Tasks...");
        for (const t of data.tasks) await prisma.task.create({ data: t }).catch(e => { });

        console.log("Importing Task Dependencies...");
        for (const t of data.taskDependencies) await prisma.taskDependency.create({ data: t }).catch(e => { });

        // --- 4. Details ---
        console.log("Importing Assets, Comments, TimeLogs...");
        for (const a of data.assets) await prisma.asset.create({ data: a }).catch(e => { });
        for (const c of data.comments) await prisma.comment.create({ data: c }).catch(e => { });
        for (const t of data.timeLogs) await prisma.timeLog.create({ data: t }).catch(e => { });
        for (const n of data.notifications) await prisma.notification.create({ data: n }).catch(e => { });

        // --- 5. Finance ---
        console.log("Importing Finance Data...");
        for (const l of data.ledgers) await prisma.ledger.create({ data: l }).catch(e => { });
        for (const j of data.journalEntries) await prisma.journalEntry.create({ data: j }).catch(e => { });
        for (const l of data.journalLines) await prisma.journalLine.create({ data: l }).catch(e => { });
        for (const i of data.invoices) await prisma.invoice.create({ data: i }).catch(e => { });
        for (const ii of data.invoiceItems) await prisma.invoiceItem.create({ data: ii }).catch(e => { });

        // --- 6. HR ---
        console.log("Importing HR Data...");
        for (const i of data.attendanceRecords) await prisma.attendanceRecord.create({ data: i }).catch(e => { });
        for (const i of data.leaveRequests) await prisma.leaveRequest.create({ data: i }).catch(e => { });
        for (const i of data.regularisationRequests) await prisma.regularisationRequest.create({ data: i }).catch(e => { });
        for (const i of data.leaveAllocations) await prisma.leaveAllocation.create({ data: i }).catch(e => { });
        for (const i of data.holidays) await prisma.holiday.create({ data: i }).catch(e => { });
        for (const i of data.shiftPresets) await prisma.shiftPreset.create({ data: i }).catch(e => { });
        for (const i of data.payrollRuns) await prisma.payrollRun.create({ data: i }).catch(e => { });
        for (const i of data.payrollSlips) await prisma.payrollSlip.create({ data: i }).catch(e => { });
        for (const i of data.biometricCredentials) await prisma.biometricCredential.create({ data: i }).catch(e => { });

        // --- 7. Others ---
        console.log("Importing Misc Data...");
        for (const i of data.adAccounts) await prisma.adAccount.create({ data: i }).catch(e => { });
        // SpendSnapshot has BigInt
        for (const item of data.spendSnapshots) {
            await prisma.spendSnapshot.create({
                data: { ...item, spend_micros: BigInt(item.spend_micros) }
            }).catch(e => { });
        }
        for (const i of data.leads) await prisma.lead.create({ data: i }).catch(e => { });
        for (const i of data.stickyNotes) await prisma.stickyNote.create({ data: i }).catch(e => { });
        for (const i of data.stickyTasks) await prisma.stickyTask.create({ data: i }).catch(e => { });
        for (const i of data.stickyNotePermissions) await prisma.stickyNotePermission.create({ data: i }).catch(e => { });
        for (const i of data.clientContentStrategies) await prisma.clientContentStrategy.create({ data: i }).catch(e => { });

        console.log("✅ Import Complete!");

    } catch (error) {
        console.error("❌ Import Failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

importData();
