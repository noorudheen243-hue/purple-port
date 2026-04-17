import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const extractDir = '/var/www/purple-port/server/uploads/temp/extract-1772041679955';

const readJsonFile = (name: string): any[] => {
    const filePath = path.join(extractDir, `${name}.json`);
    if (!fs.existsSync(filePath)) return [];
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
    catch { return []; }
};

async function main() {
    console.log("Starting restore process from extracted backup json files...");
    
    // Uploads
    const sourceUploads = path.join(extractDir, 'uploads');
    if (fs.existsSync(sourceUploads)) {
        const targetUploads = path.join('/var/www/purple-port/server', 'uploads');
        try { fs.cpSync(sourceUploads, targetUploads, { recursive: true, force: true }); } catch { }
    }

    await prisma.$transaction(async (tx: any) => {
        console.log("Breaking circular FKs...");
        await tx.user.updateMany({ data: { linked_client_id: null } as any });
        await tx.client.updateMany({ data: { account_manager_id: null } });

        console.log("Wiping down old data...");
        const tables = [
            'chatReadReceipt', 'chatMessage', 'chatParticipant', 'userLauncherPreference', 
            'metaToken', 'clientInvoiceItem', 'clientInvoice', 'contentDeliverable', 
            'stickyTask', 'stickyNotePermission', 'taskDependency', 'invoiceItem', 
            'journalLine', 'timeLog', 'comment', 'asset', 'notification', 
            'regularisationRequest', 'leaveAllocation', 'leaveRequest', 'attendanceRecord', 
            'payrollSlip', 'spendSnapshot', 'lead', 'launcherApp', 'seoLog', 
            'metaAdsLog', 'googleAdsLog', 'webDevProject', 'report', 
            'clientContentStrategy', 'adInsight', 'adCreative', 'adSet', 'adCampaign', 
            'stickyNote', 'task', 'invoice', 'journalEntry', 'ledger', 'adAccount', 
            'campaign', 'payrollRun', 'holiday', 'staffProfile', 'accountHead', 
            'client', 'chatConversation', 'user'
        ];
        
        for (const t of tables) {
            if (tx[t]) {
                await tx[t].deleteMany();
            }
        }

        const restore = async (name: string, table: any) => {
            if (!table) return;
            const rows = readJsonFile(name);
            console.log(`Restoring ${rows.length} rows to ${name}...`);
            for (let i = 0; i < rows.length; i += 50) {
                const chunk = rows.slice(i, i + 50);
                try {
                    await table.createMany({ data: chunk });
                } catch {
                    for (const row of chunk) {
                        try { await table.create({ data: row }); } catch { }
                    }
                }
            }
        };

        console.log("Injecting JSON data...");
        const inserts = [
            {n: 'users',              m: tx.user},
            {n: 'staffProfiles',      m: tx.staffProfile},
            {n: 'accountHeads',       m: tx.accountHead},
            {n: 'clients',            m: tx.client},
            {n: 'adAccounts',         m: tx.adAccount},
            {n: 'leads',              m: tx.lead},
            {n: 'campaigns',          m: tx.campaign},
            {n: 'spendSnapshots',     m: tx.spendSnapshot},
            {n: 'tasks',              m: tx.task},
            {n: 'taskDependencies',   m: tx.taskDependency},
            {n: 'assets',             m: tx.asset},
            {n: 'comments',           m: tx.comment},
            {n: 'timeLogs',           m: tx.timeLog},
            {n: 'notifications',      m: tx.notification},
            {n: 'stickyNotes',        m: tx.stickyNote},
            {n: 'stickyTasks',        m: tx.stickyTask},
            {n: 'stickyNotePermissions', m: tx.stickyNotePermission},
            {n: 'holidays',           m: tx.holiday},
            {n: 'attendanceRecords',  m: tx.attendanceRecord},
            {n: 'leaveRequests',      m: tx.leaveRequest},
            {n: 'payrollRuns',        m: tx.payrollRun},
            {n: 'payrollSlips',       m: tx.payrollSlip},
            {n: 'ledgers',            m: tx.ledger},
            {n: 'journalEntries',     m: tx.journalEntry},
            {n: 'journalLines',       m: tx.journalLine},
            {n: 'invoices',           m: tx.invoice},
            {n: 'invoiceItems',       m: tx.invoiceItem}
        ];

        for (const item of inserts) {
            await restore(item.n, item.m);
        }
    });

    console.log("DONE");
}

main().catch(console.error).finally(() => prisma.$disconnect());
