import { Request, Response } from 'express';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import AdmZip from 'adm-zip';

const prisma = new PrismaClient();

export const downloadBackup = async (req: Request, res: Response) => {
    try {
        const { secret } = req.query;

        // 1. Security Check
        const backupSecret = process.env.BACKUP_SECRET || 'CHANGE_THIS_SECRET';
        if (secret !== backupSecret) {
            console.warn(`[Backup] Unauthorized access attempt from ${req.ip}`);
            return res.status(403).json({ message: 'Forbidden' });
        }

        console.log(`[Backup] Starting backup download for ${req.ip}`);

        // 2. Setup Response Headers
        const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        // 3. Initialize Archiver
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });

        // Handle errors
        archive.on('error', (err) => {
            console.error('[Backup] Archive Error:', err);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Backup generation failed' });
            } else {
                res.end();
            }
        });

        // Pipe archive to response
        archive.pipe(res);

        // 4. Add Database File
        // Detect environment: Production uses prod.db (usually), Dev uses dev.db or from ENV
        // We usually expect DATABASE_URL="file:./prod.db"
        const dbUrl = process.env.DATABASE_URL;
        let dbPath = 'prisma/dev.db'; // fallback

        if (dbUrl && dbUrl.startsWith('file:')) {
            const relativePath = dbUrl.replace('file:', '');
            // Resolve relative to prisma folder or root? Prisma schema usually says "file:./dev.db" meaning relative to schema file?
            // Actually, in prisma schema it is relative to the schema file location.
            // But usually in deployment we put db in 'prisma' folder or root.
            // Let's look for likely candidates.
            const candidates = [
                path.join(process.cwd(), 'prisma', 'prod.db'),
                path.join(process.cwd(), 'prisma', 'dev.db'),
                path.join(process.cwd(), relativePath)
            ];

            const found = candidates.find(p => fs.existsSync(p));
            if (found) {
                dbPath = found;
            }
        }

        if (fs.existsSync(dbPath)) {
            console.log(`[Backup] Adding Database: ${dbPath}`);
            archive.file(dbPath, { name: 'database.sqlite' });
        } else {
            console.warn('[Backup] Database file not found to backup!');
            archive.append('Database file missing at time of backup', { name: 'db_missing.txt' });
        }

        // 5. Add Uploads Directory
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (fs.existsSync(uploadsDir)) {
            console.log(`[Backup] Adding Uploads: ${uploadsDir}`);
            archive.directory(uploadsDir, 'uploads');
        } else {
            archive.append('Uploads directory missing', { name: 'uploads_missing.txt' });
        }

        // 6. Finalize
        await archive.finalize();
        console.log('[Backup] Backup stream complete.');

    } catch (error: any) {
        console.error('[Backup] Critical Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
        }
    }
};

// ... (Previous imports)
// No changes to imports

// 6. Refactored Export (Memory Efficient)
export const exportFullBackupZip = async (req: Request, res: Response) => {
    try {
        console.log(`[Backup] Starting Full Backup (ZIP) for ${req.ip}`);

        const archive = archiver('zip', { zlib: { level: 9 } });
        const filename = `purple-port-backup-${new Date().toISOString().split('T')[0]}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        // Handle Archiver Errors
        archive.on('error', (err) => {
            console.error('[Backup] Archive Error:', err);
            if (!res.headersSent) res.status(500).json({ message: 'Backup generation failed' });
        });

        // Pipe early
        archive.pipe(res);

        // -- Add Data Files individually to avoid One Giant String --

        const backupTable = async (name: string, model: any) => {
            try {
                const data = await model.findMany();
                archive.append(JSON.stringify(data, null, 2), { name: `${name}.json` });
            } catch (e) {
                console.error(`[Backup] Failed to backup table ${name}:`, e);
                archive.append(JSON.stringify({ error: String(e) }), { name: `${name}_error.json` });
            }
        };

        // Core
        await backupTable('users', prisma.user);
        await backupTable('staffProfiles', prisma.staffProfile);
        await backupTable('clients', prisma.client);
        await backupTable('campaigns', prisma.campaign);
        await backupTable('tasks', prisma.task);
        await backupTable('taskDependencies', prisma.taskDependency);
        await backupTable('assets', prisma.asset);
        await backupTable('comments', prisma.comment);
        await backupTable('timeLogs', prisma.timeLog);

        // Accounting
        await backupTable('accountHeads', prisma.accountHead);
        await backupTable('ledgers', prisma.ledger);
        await backupTable('journalEntries', prisma.journalEntry);
        await backupTable('journalLines', prisma.journalLine);
        await backupTable('invoices', prisma.invoice);
        await backupTable('invoiceItems', prisma.invoiceItem);

        // HR & Payroll
        await backupTable('notifications', prisma.notification);
        await backupTable('attendanceRecords', prisma.attendanceRecord);
        await backupTable('leaveRequests', prisma.leaveRequest);
        await backupTable('holidays', prisma.holiday);
        await backupTable('payrollRuns', prisma.payrollRun);
        await backupTable('payrollSlips', prisma.payrollSlip);

        // Other
        await backupTable('stickyNotes', prisma.stickyNote);
        await backupTable('stickyTasks', prisma.stickyTask);
        await backupTable('stickyNotePermissions', prisma.stickyNotePermission);
        await backupTable('adAccounts', prisma.adAccount);
        await backupTable('spendSnapshots', prisma.spendSnapshot);
        await backupTable('leads', prisma.lead);

        // Uploads
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (fs.existsSync(uploadsDir)) {
            console.log(`[Backup] Adding Uploads: ${uploadsDir}`);
            archive.directory(uploadsDir, 'uploads');
        }

        await archive.finalize();
        console.log(`[Backup] Full Backup ZIP sent.`);

    } catch (error: any) {
        console.error('[Backup] Export Error:', error);
        if (!res.headersSent) res.status(500).json({ message: `Export failed: ${error.message}` });
    }
};

export const importFullBackupZip = async (req: Request, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        console.log(`[Backup] Starting Import from ${req.file.originalname}`);
        const zipPath = req.file.path;

        const zip = new AdmZip(zipPath);
        const zipEntries = zip.getEntries();

        let data: any = {};

        // 1. Check for consolidated data.json (Legacy)
        const dataEntry = zipEntries.find(entry => entry.entryName === 'data.json');
        if (dataEntry) {
            console.log('[Backup] Found legacy data.json');
            data = JSON.parse(dataEntry.getData().toString('utf8'));
        } else {
            console.log('[Backup] Extracting individual JSON files...');
            // 2. Reconstruct from individual files
            const tables = [
                'users', 'staffProfiles', 'clients', 'campaigns', 'tasks', 'taskDependencies',
                'assets', 'comments', 'timeLogs', 'accountHeads', 'ledgers', 'journalEntries',
                'journalLines', 'invoices', 'invoiceItems', 'notifications', 'attendanceRecords',
                'leaveRequests', 'holidays', 'payrollRuns', 'payrollSlips', 'stickyNotes',
                'stickyTasks', 'stickyNotePermissions', 'adAccounts', 'spendSnapshots', 'leads'
            ];

            for (const table of tables) {
                const entry = zipEntries.find(e => e.entryName === `${table}.json`);
                if (entry) {
                    try {
                        data[table] = JSON.parse(entry.getData().toString('utf8'));
                    } catch (e) {
                        console.warn(`[Backup] Failed to parse ${table}.json, skipping.`);
                    }
                }
            }
        }

        // 2. Extract Uploads (Unchanged)
        const uploadsEntry = zipEntries.filter(entry => entry.entryName.startsWith('uploads/'));
        if (uploadsEntry.length > 0) {
            console.log(`[Backup] Restoring ${uploadsEntry.length} files to uploads/...`);
            zip.extractAllTo(process.cwd(), true);
            // Cleanup data.json from root if it was extracted (Legacy artifact)
            if (fs.existsSync(path.join(process.cwd(), 'data.json'))) {
                try { fs.unlinkSync(path.join(process.cwd(), 'data.json')); } catch (e) { /* ignore */ }
            }
        }

        // 3. Import Database
        // Note: Using the exact same transaction logic, just passing the constructed 'data' object
        // ... (Transaction Logic - Inserted directly below to ensure scope)
        await prisma.$transaction(async (tx) => {
            console.log('[Backup] Wiping tables...');

            // -- Wipe Old Data --
            await tx.stickyTask.deleteMany();
            await tx.stickyNotePermission.deleteMany();
            await tx.taskDependency.deleteMany();
            await tx.invoiceItem.deleteMany();
            await tx.journalLine.deleteMany();
            await tx.timeLog.deleteMany();
            await tx.comment.deleteMany();
            await tx.asset.deleteMany();
            await tx.notification.deleteMany();
            await tx.leaveRequest.deleteMany();
            await tx.attendanceRecord.deleteMany();
            await tx.payrollSlip.deleteMany();
            await tx.spendSnapshot.deleteMany();
            await tx.lead.deleteMany();

            await tx.stickyNote.deleteMany();
            await tx.task.deleteMany();
            await tx.invoice.deleteMany();
            await tx.journalEntry.deleteMany();
            await tx.ledger.deleteMany();
            await tx.adAccount.deleteMany();
            await tx.campaign.deleteMany();
            await tx.payrollRun.deleteMany();
            await tx.holiday.deleteMany();
            await tx.staffProfile.deleteMany();

            await tx.accountHead.deleteMany();
            await tx.client.deleteMany();
            await tx.user.deleteMany();

            console.log('[Backup] DB Wiped. Inserting new data...');

            // -- Insert New Data --
            if (data.users?.length) await tx.user.createMany({ data: data.users });
            if (data.staffProfiles?.length) await tx.staffProfile.createMany({ data: data.staffProfiles });
            if (data.accountHeads?.length) await tx.accountHead.createMany({ data: data.accountHeads });
            if (data.clients?.length) await tx.client.createMany({ data: data.clients });
            if (data.adAccounts?.length) await tx.adAccount.createMany({ data: data.adAccounts });
            if (data.leads?.length) await tx.lead.createMany({ data: data.leads });

            if (data.campaigns?.length) await tx.campaign.createMany({ data: data.campaigns });
            if (data.spendSnapshots?.length) await tx.spendSnapshot.createMany({ data: data.spendSnapshots });

            if (data.tasks?.length) await tx.task.createMany({ data: data.tasks });
            if (data.taskDependencies?.length) await tx.taskDependency.createMany({ data: data.taskDependencies });

            if (data.assets?.length) await tx.asset.createMany({ data: data.assets });
            if (data.comments?.length) await tx.comment.createMany({ data: data.comments });
            if (data.timeLogs?.length) await tx.timeLog.createMany({ data: data.timeLogs });

            if (data.notifications?.length) await tx.notification.createMany({ data: data.notifications });
            if (data.stickyNotes?.length) await tx.stickyNote.createMany({ data: data.stickyNotes });
            if (data.stickyTasks?.length) await tx.stickyTask.createMany({ data: data.stickyTasks });
            if (data.stickyNotePermissions?.length) await tx.stickyNotePermission.createMany({ data: data.stickyNotePermissions });

            if (data.holidays?.length) await tx.holiday.createMany({ data: data.holidays });
            if (data.attendanceRecords?.length) await tx.attendanceRecord.createMany({ data: data.attendanceRecords });
            if (data.leaveRequests?.length) await tx.leaveRequest.createMany({ data: data.leaveRequests });
            if (data.payrollRuns?.length) await tx.payrollRun.createMany({ data: data.payrollRuns });
            if (data.payrollSlips?.length) await tx.payrollSlip.createMany({ data: data.payrollSlips });

            if (data.accountHeads?.length) {
                if (data.ledgers?.length) await tx.ledger.createMany({ data: data.ledgers });
                if (data.journalEntries?.length) await tx.journalEntry.createMany({ data: data.journalEntries });
                if (data.journalLines?.length) await tx.journalLine.createMany({ data: data.journalLines });
                if (data.invoices?.length) await tx.invoice.createMany({ data: data.invoices });
                if (data.invoiceItems?.length) await tx.invoiceItem.createMany({ data: data.invoiceItems });
            }
        });

        // Cleanup
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Full Backup restored successfully' });

    } catch (error: any) {
        console.error('[Backup] Import Error:', error);
        res.status(500).json({ message: error.message || 'Import failed' });
    }
};
