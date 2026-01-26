import { Request, Response } from 'express';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import AdmZip from 'adm-zip';
import { Readable } from 'stream';

const prisma = new PrismaClient();

// Helper: Stream Prisma Data in Chunks to avoid OOM
class TableStream extends Readable {
    private model: any;
    private batchSize: number;
    private cursor: string | null = null;
    private isFirst: boolean = true;
    private hasStarted: boolean = false;
    private totalProcessed: number = 0;

    constructor(model: any, batchSize = 500) {
        super();
        this.model = model;
        this.batchSize = batchSize;
    }

    async _read() {
        try {
            if (!this.hasStarted) {
                this.push('[');
                this.hasStarted = true;
            }

            const params: any = {
                take: this.batchSize,
                orderBy: { id: 'asc' } // Ensure deterministic order
            };

            if (this.cursor) {
                params.cursor = { id: this.cursor };
                params.skip = 1; // Skip the cursor itself
            }

            const chunk = await this.model.findMany(params);

            if (chunk.length === 0) {
                this.push(']'); // Close Array
                this.push(null); // EOF
                return;
            }

            // Process Chunk
            let jsonChunk = '';
            for (let i = 0; i < chunk.length; i++) {
                const record = chunk[i];
                if (!this.isFirst) {
                    jsonChunk += ',';
                } else {
                    this.isFirst = false;
                }
                jsonChunk += JSON.stringify(record);

                // Update Cursor
                if (i === chunk.length - 1) {
                    this.cursor = record.id;
                }
            }

            this.totalProcessed += chunk.length;
            this.push(jsonChunk);

        } catch (error) {
            console.error('[Backup] Stream Error:', error);
            this.destroy(error as Error);
        }
    }
}

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
            if (secret !== (process.env.BACKUP_SECRET || 'CHANGE_THIS_SECRET')) return res.status(403).json({ message: 'Forbidden' });

            const archive = archiver('zip', { zlib: { level: 9 } });
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename=legacy-backup.zip`);
            archive.pipe(res);

            const dbPath = process.env.DATABASE_URL?.replace('file:', '') || 'prisma/dev.db';
            if (fs.existsSync(dbPath)) archive.file(dbPath, { name: 'database.sqlite' });

            const uploadsDir = path.join(process.cwd(), 'uploads');
            if (fs.existsSync(uploadsDir)) archive.directory(uploadsDir, 'uploads');

            await archive.finalize();
        }
    } catch (e) {
        if (!res.headersSent) res.status(500).json({ error: String(e) });
    }
};

// ... (Previous imports)
// No changes to imports

// 6. Refactored Export (Memory Efficient)
export const exportFullBackupZip = async (req: Request, res: Response) => {
    try {
        console.log(`[Backup] Starting Streamed Backup (ZIP) for ${req.ip}`);

        const archive = archiver('zip', { zlib: { level: 9 } });
        const filename = `purple-port-backup-${new Date().toISOString().split('T')[0]}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        archive.on('error', (err) => {
            console.error('[Backup] Archive Error:', err);
            // Can't send JSON if headers sent, but we log it.
        });

        archive.pipe(res);

        // -- Stream Tables --
        const addTableToArchive = (name: string, model: any) => {
            const stream = new TableStream(model);
            archive.append(stream, { name: `${name}.json` });
        };

        // Core
        addTableToArchive('users', prisma.user);
        addTableToArchive('staffProfiles', prisma.staffProfile);
        addTableToArchive('clients', prisma.client);
        addTableToArchive('campaigns', prisma.campaign);
        addTableToArchive('tasks', prisma.task);
        addTableToArchive('taskDependencies', prisma.taskDependency);
        addTableToArchive('assets', prisma.asset);
        addTableToArchive('comments', prisma.comment);
        // TimeLogs can be huge -> Streaming is Critical
        addTableToArchive('timeLogs', prisma.timeLog);

        // Accounting
        addTableToArchive('accountHeads', prisma.accountHead);
        addTableToArchive('ledgers', prisma.ledger);
        addTableToArchive('journalEntries', prisma.journalEntry);
        addTableToArchive('journalLines', prisma.journalLine);
        addTableToArchive('invoices', prisma.invoice);
        addTableToArchive('invoiceItems', prisma.invoiceItem);

        // HR & Payroll
        addTableToArchive('notifications', prisma.notification);
        // AttendanceRecords can be huge -> Streaming is Critical
        addTableToArchive('attendanceRecords', prisma.attendanceRecord);
        addTableToArchive('leaveRequests', prisma.leaveRequest);
        addTableToArchive('holidays', prisma.holiday);
        addTableToArchive('payrollRuns', prisma.payrollRun);
        addTableToArchive('payrollSlips', prisma.payrollSlip);

        // Other
        addTableToArchive('stickyNotes', prisma.stickyNote);
        addTableToArchive('stickyTasks', prisma.stickyTask);
        addTableToArchive('stickyNotePermissions', prisma.stickyNotePermission);
        addTableToArchive('adAccounts', prisma.adAccount);
        addTableToArchive('spendSnapshots', prisma.spendSnapshot);
        addTableToArchive('leads', prisma.lead);

        // Uploads
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (fs.existsSync(uploadsDir)) {
            console.log(`[Backup] Streaming Uploads Directory...`);
            archive.directory(uploadsDir, 'uploads');
        }

        await archive.finalize();
        console.log(`[Backup] Backup Stream Finalized.`);

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
        // Limit Max JSON size to prevent OOM during Import parsing
        // If files are huge, simple JSON.parse might still fail. 
        // For import, we might need a stream parser if it fails, but usually import is rarer / controlled.
        // For now, we keep Memory Import logic but add handling for individual files.

        // Helper: Safe Parse
        const parseEntry = (name: string) => {
            const entry = zipEntries.find(e => e.entryName === name || e.entryName === `${name}.json`);
            if (entry) {
                try {
                    return JSON.parse(entry.getData().toString('utf8'));
                } catch (e) {
                    console.error(`[Backup] Failed to parse ${name}:`, e);
                    return [];
                }
            }
            return [];
        };

        // 2. Extract Uploads
        const uploadsEntry = zipEntries.filter(entry => entry.entryName.startsWith('uploads/'));
        if (uploadsEntry.length > 0) {
            console.log(`[Backup] Restoring ${uploadsEntry.length} files to uploads/...`);
            zip.extractAllTo(process.cwd(), true);
        }

        await prisma.$transaction(async (tx) => {
            // Wiping (Order: Leaf -> Root)
            console.log('[Backup] Wiping tables...');
            // Wiping (Order: Leaf -> Root)
            console.log('[Backup] Wiping tables...');

            // Explicit calls to satisfy TypeScript union complexity
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

            console.log('[Backup] Tables Wiped. Starting Restoration...');

            // Inserting (Order: Root -> Leaf)
            // We read from ZIP just-in-time to save memory

            const restore = async (name: string, table: any) => {
                const rows = parseEntry(name);
                if (rows && rows.length > 0) {
                    // Insert in chunks of 500 to invoke less SQLite variable limit issues
                    for (let i = 0; i < rows.length; i += 500) {
                        const chunk = rows.slice(i, i + 500);
                        await table.createMany({ data: chunk });
                    }
                    console.log(`[Backup] Restored ${rows.length} records to ${name}`);
                }
            };

            await restore('users', tx.user);
            await restore('staffProfiles', tx.staffProfile);
            await restore('accountHeads', tx.accountHead);
            await restore('clients', tx.client);
            await restore('adAccounts', tx.adAccount);
            await restore('leads', tx.lead);

            await restore('campaigns', tx.campaign);
            await restore('spendSnapshots', tx.spendSnapshot);

            await restore('tasks', tx.task);
            await restore('taskDependencies', tx.taskDependency);

            await restore('assets', tx.asset);
            await restore('comments', tx.comment);
            await restore('timeLogs', tx.timeLog);

            await restore('notifications', tx.notification);
            await restore('stickyNotes', tx.stickyNote);
            await restore('stickyTasks', tx.stickyTask);
            await restore('stickyNotePermissions', tx.stickyNotePermission);

            await restore('holidays', tx.holiday);
            await restore('attendanceRecords', tx.attendanceRecord);
            await restore('leaveRequests', tx.leaveRequest);
            await restore('payrollRuns', tx.payrollRun);
            await restore('payrollSlips', tx.payrollSlip);

            await restore('ledgers', tx.ledger);
            await restore('journalEntries', tx.journalEntry);
            await restore('journalLines', tx.journalLine);
            await restore('invoices', tx.invoice);
            await restore('invoiceItems', tx.invoiceItem);
        });

        // Cleanup
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Full Backup restored successfully' });

    } catch (error: any) {
        console.error('[Backup] Import Error:', error);
        res.status(500).json({ message: error.message || 'Import failed' });
    }
};
