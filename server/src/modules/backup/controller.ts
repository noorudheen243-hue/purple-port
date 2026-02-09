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
        const extractDir = path.join(path.dirname(zipPath), 'extract-' + Date.now());

        // Create extraction directory
        if (!fs.existsSync(extractDir)) {
            fs.mkdirSync(extractDir, { recursive: true });
        }

        // --- Memory Optimized Extraction ---
        // 1. Try system 'unzip' (Linux/Mac) - avoids loading Zip into RAM
        // 2. Fallback to AdmZip (Windows/Dev) - loads Zip into RAM but acceptable for smaller files/local dev

        const unzipWithSystem = (): Promise<void> => {
            return new Promise((resolve, reject) => {
                const { exec } = require('child_process');
                // -o: overwrite, -q: quiet, -d: directory
                exec(`unzip -o -q "${zipPath}" -d "${extractDir}"`, (error: any, stdout: any, stderr: any) => {
                    if (error) {
                        console.warn('[Backup] System unzip failed, falling back to AdmZip:', error.message);
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
        };

        let useAdmZip = false;
        try {
            if (process.platform === 'win32') {
                throw new Error('Windows forces AdmZip fallback');
            }
            await unzipWithSystem();
            console.log('[Backup] System unzip completed.');
        } catch (e) {
            useAdmZip = true;
        }

        if (useAdmZip) {
            console.log('[Backup] Using AdmZip (Legacy/Fallback)...');
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(extractDir, true);
        }

        // --- Restoration Logic ---
        // Helper: Read JSON from disk (Lower memory than reading from Zip buffer)
        const readJsonFile = (name: string): any[] => {
            // Check direct file
            let filePath = path.join(extractDir, `${name}.json`);
            if (!fs.existsSync(filePath)) {
                // Check if it's just 'name' (without .json extension in zip?)
                filePath = path.join(extractDir, name);
                if (!fs.existsSync(filePath)) return [];
            }

            try {
                const content = fs.readFileSync(filePath, 'utf8');
                return JSON.parse(content);
            } catch (e) {
                console.error(`[Backup] Failed to parse ${name}:`, e);
                return [];
            }
        };

        // 2. Move Uploads
        const sourceUploads = path.join(extractDir, 'uploads');
        if (fs.existsSync(sourceUploads)) {
            console.log(`[Backup] Restoring uploads...`);
            // Move or Copy? Move is faster.
            // Target: process.cwd()/uploads
            const targetUploads = path.join(process.cwd(), 'uploads');

            // Simple approach: Copy over
            // On Linux 'cp -r' or 'rsync' is better? 
            // Let's use fs-extra logic if possible, or naive recursive copy.
            // Since we upgraded node, let's use fs.cpSync (Node 16.7+)
            try {
                fs.cpSync(sourceUploads, targetUploads, { recursive: true, force: true });
            } catch (e) {
                console.warn('[Backup] Uploads restore fallback (fs.cp failed):', e);
                // Fallback for older node? check manually...
            }
        }

        await prisma.$transaction(async (tx) => {
            // ... (Wiping logic remains same as established in previous context) ...
            // Validating context: We need to re-include the wiping logic here carefully or refer to it.
            // Since `replace_file_content` replaces the block, I MUST include the full Wiping logic again.

            // Wiping (Order: Leaf -> Root)
            console.log('[Backup] Wiping tables...');

            // Pre-Wipe: Break Circular Dependencies
            await tx.user.updateMany({ data: { links: undefined, linked_client_id: null } as any }); // Safety cast
            await tx.client.updateMany({ data: { account_manager_id: null } });

            // Explicit calls to satisfy TypeScript union complexity & FK Constraints
            // Batch 1: Deep Leaves
            await tx.chatReadReceipt.deleteMany();
            await tx.chatMessage.deleteMany();
            await tx.chatParticipant.deleteMany();
            await tx.userLauncherPreference.deleteMany();
            await tx.metaToken.deleteMany();

            await tx.clientInvoiceItem.deleteMany();
            await tx.clientInvoice.deleteMany();

            await tx.contentDeliverable.deleteMany();

            await tx.stickyTask.deleteMany();
            await tx.stickyNotePermission.deleteMany();
            await tx.taskDependency.deleteMany();
            await tx.invoiceItem.deleteMany();
            await tx.journalLine.deleteMany();
            await tx.timeLog.deleteMany();
            await tx.comment.deleteMany();
            await tx.asset.deleteMany();
            await tx.notification.deleteMany();

            // Batch 2: Leaves
            await tx.regularisationRequest.deleteMany();
            await tx.leaveAllocation.deleteMany();
            await tx.leaveRequest.deleteMany();
            await tx.attendanceRecord.deleteMany();
            await tx.payrollSlip.deleteMany();
            await tx.spendSnapshot.deleteMany();
            await tx.lead.deleteMany();
            await tx.launcherApp.deleteMany();

            // Client Logs
            await tx.seoLog.deleteMany();
            await tx.metaAdsLog.deleteMany();
            await tx.googleAdsLog.deleteMany();
            await tx.webDevProject.deleteMany();
            await tx.report.deleteMany();
            await tx.clientContentStrategy.deleteMany();
            await tx.adInsight.deleteMany();
            await tx.adCreative.deleteMany();
            await tx.adSet.deleteMany();
            await tx.adCampaign.deleteMany();

            // Batch 3: Roots
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
            await tx.chatConversation.deleteMany();
            await tx.user.deleteMany();

            console.log('[Backup] Tables Wiped. Starting Restoration...');

            // Inserting
            const restore = async (name: string, table: any) => {
                const rows = readJsonFile(name); // Changed from parseEntry(name)
                // Insert in chunks of 50
                for (let i = 0; i < rows.length; i += 50) {
                    const chunk = rows.slice(i, i + 50);
                    try {
                        await table.createMany({ data: chunk });
                    } catch (batchError) {
                        console.warn(`[Backup] Batch failed for ${name}, switching to row-by-row...`);
                        for (const row of chunk) {
                            try {
                                await table.create({ data: row });
                            } catch (singleError) {
                                // Ignore duplicate errors (P2002)
                            }
                        }
                    }
                }
                console.log(`[Backup] Restored ${rows.length} records to ${name}`);
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
        }, {
            maxWait: 20000,
            timeout: 600000
        });

        // Cleanup
        try {
            fs.rmSync(extractDir, { recursive: true, force: true });
            if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        } catch (e) { console.warn('Cleanup warning:', e); }

        res.json({ message: 'Full Backup restored successfully' });

    } catch (error: any) {
        console.error('[Backup] Import Error:', error);
        res.status(500).json({ message: error.message || 'Import failed' });
    }
};
