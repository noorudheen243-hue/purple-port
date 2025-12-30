import { Request, Response } from 'express';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

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

export const exportDataJson = async (req: Request, res: Response) => {
    try {
        console.log(`[Backup] Starting JSON Export for ${req.ip}`);

        const data: any = {};

        // 1. Fetch Critical Data
        // Core
        data.users = await prisma.user.findMany();
        data.staffProfiles = await prisma.staffProfile.findMany(); // Linked to Users

        // Modules
        data.clients = await prisma.client.findMany();
        data.campaigns = await prisma.campaign.findMany();
        data.tasks = await prisma.task.findMany();

        // Assets & Interactions
        data.assets = await prisma.asset.findMany();
        data.comments = await prisma.comment.findMany();
        data.timeLogs = await prisma.timeLog.findMany();

        // Accounting
        data.accountHeads = await prisma.accountHead.findMany();
        data.ledgers = await prisma.ledger.findMany();
        data.journalEntries = await prisma.journalEntry.findMany();
        data.journalLines = await prisma.journalLine.findMany();
        data.invoices = await prisma.invoice.findMany();
        data.invoiceItems = await prisma.invoiceItem.findMany();

        // 2. Stream Response
        const filename = `purple-port-data-${new Date().toISOString().split('T')[0]}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        res.send(JSON.stringify(data, null, 2));
        console.log(`[Backup] JSON Data sent (${Object.keys(data).length} tables)`);

    } catch (error: any) {
        console.error('[Backup] JSON Export Error:', error);
        res.status(500).json({ message: 'Export failed' });
    }
};

export const importDataJson = async (req: Request, res: Response) => {
    try {
        // Multer puts file in req.file
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log(`[Backup] Starting Query Import from ${req.file.originalname}`);

        // 1. Read JSON
        const rawData = fs.readFileSync(req.file.path, 'utf-8');
        const data = JSON.parse(rawData);

        // 2. Clean Database (Reverse dependency order to avoid constraints)
        // DANGER: THIS WIPES DATA. This is "Sync" mode.
        await prisma.$transaction(async (tx) => {
            // -- Level 4: Lowest Dependents --
            await tx.timeLog.deleteMany();
            await tx.comment.deleteMany();
            await tx.asset.deleteMany();

            // -- Level 3: Items/Transaction Lines --
            await tx.invoiceItem.deleteMany();
            await tx.journalLine.deleteMany();

            // -- Level 2: Headers --
            await tx.task.deleteMany(); // Depends on Campaign/Client/User
            await tx.invoice.deleteMany();
            await tx.journalEntry.deleteMany();

            // -- Level 1: Core Entities --
            await tx.campaign.deleteMany(); // Depends on Client
            await tx.ledger.deleteMany(); // Depends on Head
            await tx.accountHead.deleteMany();
            await tx.staffProfile.deleteMany(); // Depends on User

            // -- Level 0: Roots --
            await tx.client.deleteMany();
            await tx.user.deleteMany();
            // Note: We don't delete AdAccounts/Snapshots in MVP unless requested specifically

            console.log('[Backup] Old data wiped.');

            // 3. Insert New Data (CreateMany is fastest)
            if (data.users?.length) await tx.user.createMany({ data: data.users });
            if (data.staffProfiles?.length) await tx.staffProfile.createMany({ data: data.staffProfiles });

            if (data.accountHeads?.length) await tx.accountHead.createMany({ data: data.accountHeads });
            if (data.clients?.length) await tx.client.createMany({ data: data.clients });
            if (data.campaigns?.length) await tx.campaign.createMany({ data: data.campaigns });

            if (data.tasks?.length) await tx.task.createMany({ data: data.tasks });

            if (data.assets?.length) await tx.asset.createMany({ data: data.assets });
            if (data.comments?.length) await tx.comment.createMany({ data: data.comments });
            if (data.timeLogs?.length) await tx.timeLog.createMany({ data: data.timeLogs });

            if (data.accountHeads?.length) {
                // Ledgers etc
                if (data.ledgers?.length) await tx.ledger.createMany({ data: data.ledgers });
                if (data.journalEntries?.length) await tx.journalEntry.createMany({ data: data.journalEntries });
                if (data.journalLines?.length) await tx.journalLine.createMany({ data: data.journalLines });
                if (data.invoices?.length) await tx.invoice.createMany({ data: data.invoices });
                if (data.invoiceItems?.length) await tx.invoiceItem.createMany({ data: data.invoiceItems });
            }

            console.log('[Backup] Import Transaction Complete.');
        });

        // Cleanup temp file
        fs.unlinkSync(req.file.path);

        res.json({ message: 'Data imported successfully' });

    } catch (error: any) {
        console.error('[Backup] JSON Import Error:', error);
        res.status(500).json({ message: error.message || 'Import failed' });
    }
};
