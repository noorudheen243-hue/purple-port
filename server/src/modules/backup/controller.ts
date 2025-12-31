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

export const exportFullBackupZip = async (req: Request, res: Response) => {
    try {
        console.log(`[Backup] Starting Full Backup (ZIP) for ${req.ip}`);

        const data: any = {};

        // 1. Fetch Critical Data (Same as before)
        // 1. Fetch Critical Data (Same as before)
        data.users = await prisma.user.findMany();
        data.staffProfiles = await prisma.staffProfile.findMany();
        data.clients = await prisma.client.findMany();
        data.campaigns = await prisma.campaign.findMany();
        data.tasks = await prisma.task.findMany();
        data.taskDependencies = await prisma.taskDependency.findMany(); // NEW
        data.assets = await prisma.asset.findMany();
        data.comments = await prisma.comment.findMany();
        data.timeLogs = await prisma.timeLog.findMany();
        data.accountHeads = await prisma.accountHead.findMany();
        data.ledgers = await prisma.ledger.findMany();
        data.journalEntries = await prisma.journalEntry.findMany();
        data.journalLines = await prisma.journalLine.findMany();
        data.invoices = await prisma.invoice.findMany();
        data.invoiceItems = await prisma.invoiceItem.findMany();

        // NEW: Extended Data
        data.notifications = await prisma.notification.findMany();
        data.attendanceRecords = await prisma.attendanceRecord.findMany();
        data.leaveRequests = await prisma.leaveRequest.findMany();
        data.holidays = await prisma.holiday.findMany();
        data.payrollRuns = await prisma.payrollRun.findMany();
        data.payrollSlips = await prisma.payrollSlip.findMany();

        data.stickyNotes = await prisma.stickyNote.findMany();
        data.stickyTasks = await prisma.stickyTask.findMany();
        data.stickyNotePermissions = await prisma.stickyNotePermission.findMany();

        data.adAccounts = await prisma.adAccount.findMany();
        data.spendSnapshots = await prisma.spendSnapshot.findMany();
        data.leads = await prisma.lead.findMany();

        // 2. Create ZIP
        const archive = archiver('zip', { zlib: { level: 9 } });
        const filename = `purple-port-backup-${new Date().toISOString().split('T')[0]}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        archive.pipe(res);

        // Add Data JSON
        archive.append(JSON.stringify(data, null, 2), { name: 'data.json' });

        // Add Uploads Folder
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (fs.existsSync(uploadsDir)) {
            archive.directory(uploadsDir, 'uploads');
        }

        await archive.finalize();
        console.log(`[Backup] Full Backup ZIP sent.`);

    } catch (error: any) {
        console.error('[Backup] Export Error:', error);
        if (!res.headersSent) res.status(500).json({ message: 'Export failed' });
    }
};

export const importFullBackupZip = async (req: Request, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        console.log(`[Backup] Starting Import from ${req.file.originalname}`);
        const zipPath = req.file.path;

        // 1. Extract ZIP
        const zip = new AdmZip(zipPath);
        const zipEntries = zip.getEntries();

        let jsonData: any = null;

        // Check for data.json
        const dataEntry = zipEntries.find(entry => entry.entryName === 'data.json');
        if (dataEntry) {
            jsonData = JSON.parse(dataEntry.getData().toString('utf8'));
        } else {
            // Fallback: If user uploaded a straight JSON file
            throw new Error('Invalid Backup: data.json not found in zip');
        }

        // 2. Extract Uploads
        const uploadsEntry = zipEntries.filter(entry => entry.entryName.startsWith('uploads/'));
        if (uploadsEntry.length > 0) {
            console.log(`[Backup] Restoring ${uploadsEntry.length} files to uploads/...`);
            zip.extractAllTo(process.cwd(), true);

            // Cleanup data.json from root if it was extracted
            if (fs.existsSync(path.join(process.cwd(), 'data.json'))) {
                fs.unlinkSync(path.join(process.cwd(), 'data.json'));
            }
        }

        // 3. Import Database (Same Logic)
        if (jsonData) {
            const data = jsonData;
            await prisma.$transaction(async (tx) => {
                console.log('[Backup] Wiping tables...');

                // -- Wipe Old Data (Order matters for FK) --
                // 1. Level: Leaf nodes (depend on others but nobody depends on them)
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

                // 2. Level: Mid dependencies
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

                // 3. Level: Roots
                await tx.accountHead.deleteMany();
                await tx.client.deleteMany();
                await tx.user.deleteMany();

                console.log('[Backup] DB Wiped. Inserting new data...');

                // -- Insert New Data (Order: Roots -> Leaves) --
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

                // Notifications & Sticky Notes
                if (data.notifications?.length) await tx.notification.createMany({ data: data.notifications });
                if (data.stickyNotes?.length) await tx.stickyNote.createMany({ data: data.stickyNotes });
                if (data.stickyTasks?.length) await tx.stickyTask.createMany({ data: data.stickyTasks });
                if (data.stickyNotePermissions?.length) await tx.stickyNotePermission.createMany({ data: data.stickyNotePermissions });

                // HR & Payroll
                if (data.holidays?.length) await tx.holiday.createMany({ data: data.holidays });
                if (data.attendanceRecords?.length) await tx.attendanceRecord.createMany({ data: data.attendanceRecords });
                if (data.leaveRequests?.length) await tx.leaveRequest.createMany({ data: data.leaveRequests });
                if (data.payrollRuns?.length) await tx.payrollRun.createMany({ data: data.payrollRuns });
                if (data.payrollSlips?.length) await tx.payrollSlip.createMany({ data: data.payrollSlips });

                // Accounting
                if (data.accountHeads?.length) {
                    if (data.ledgers?.length) await tx.ledger.createMany({ data: data.ledgers });
                    if (data.journalEntries?.length) await tx.journalEntry.createMany({ data: data.journalEntries });
                    if (data.journalLines?.length) await tx.journalLine.createMany({ data: data.journalLines });
                    if (data.invoices?.length) await tx.invoice.createMany({ data: data.invoices });
                    if (data.invoiceItems?.length) await tx.invoiceItem.createMany({ data: data.invoiceItems });
                }
            });
        }

        // Cleanup temp
        fs.unlinkSync(req.file.path);

        res.json({ message: 'Full Backup restored successfully' });

    } catch (error: any) {
        console.error('[Backup] Import Error:', error);
        res.status(500).json({ message: error.message || 'Import failed' });
    }
};
