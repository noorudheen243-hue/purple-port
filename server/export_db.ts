
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function exportData() {
    console.log("🚀 Starting Data Export...");

    const data: any = {};

    // 1. Users & Auth
    data.users = await prisma.user.findMany();
    data.staffProfiles = await prisma.staffProfile.findMany();

    // 2. Core Entities
    data.accountHeads = await prisma.accountHead.findMany();
    // Clients have self-relations (portalUser), so we might need care, but generally Client depends on User (Manager)
    data.clients = await prisma.client.findMany();

    // 3. Projects & Work
    data.campaigns = await prisma.campaign.findMany();
    data.tasks = await prisma.task.findMany();

    // 4. Dependencies & Details
    data.assets = await prisma.asset.findMany();
    data.comments = await prisma.comment.findMany();
    data.timeLogs = await prisma.timeLog.findMany();
    data.notifications = await prisma.notification.findMany();

    // 5. Finance
    data.ledgers = await prisma.ledger.findMany();
    data.journalEntries = await prisma.journalEntry.findMany();
    data.journalLines = await prisma.journalLine.findMany();
    data.invoices = await prisma.invoice.findMany();
    data.invoiceItems = await prisma.invoiceItem.findMany();

    // 6. HR & Attendance
    data.attendanceRecords = await prisma.attendanceRecord.findMany();
    data.leaveRequests = await prisma.leaveRequest.findMany();
    data.regularisationRequests = await prisma.regularisationRequest.findMany();
    data.leaveAllocations = await prisma.leaveAllocation.findMany();
    data.holidays = await prisma.holiday.findMany();
    data.shifts = await prisma.shift.findMany();
    data.payrollRuns = await prisma.payrollRun.findMany();
    data.payrollSlips = await prisma.payrollSlip.findMany();
    data.biometricCredentials = await prisma.biometricCredential.findMany();

    // 7. Others
    data.adAccounts = await prisma.adAccount.findMany();
    data.spendSnapshots = await prisma.spendSnapshot.findMany();
    data.leads = await prisma.lead.findMany();
    data.stickyNotes = await prisma.stickyNote.findMany();
    data.stickyTasks = await prisma.stickyTask.findMany();
    data.stickyNotePermissions = await prisma.stickyNotePermission.findMany();
    data.clientContentStrategies = await prisma.clientContentStrategy.findMany();

    // 8. Relations Tables (Many-to-Many explicit tables if any? - Prisma handles implicit, but we have explicit ones?)
    // TaskDependency is explicit
    data.taskDependencies = await prisma.taskDependency.findMany();

    // Convert BigInt to String for JSON serialization
    const jsonParams = JSON.stringify(data, (key, value) =>
        typeof value === 'bigint'
            ? value.toString()
            : value // return everything else unchanged
        , 2);

    const outputPath = path.join(__dirname, 'full_backup.json');
    fs.writeFileSync(outputPath, jsonParams);

    console.log(`✅ Export Complete! Data saved to: ${outputPath}`);
    console.log(`📦 Size: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
}

exportData()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
