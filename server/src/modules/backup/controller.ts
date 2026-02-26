import { Request, Response } from 'express';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import AdmZip from 'adm-zip';
import { Readable } from 'stream';
import * as cron from 'node-cron';

import axios from 'axios';

const prisma = new PrismaClient();

// ─── Backup Directory Resolution ───────────────────────────────────────────────
// Windows (localhost): F:\Antigravity\Backup
// Linux (VPS):         /var/backups/antigravity
function getBackupDir(): string {
    if (process.env.BACKUP_DIR) return process.env.BACKUP_DIR;
    return process.platform === 'win32'
        ? 'F:\\Antigravity\\Backup'
        : '/var/backups/antigravity';
}

function ensureBackupDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[Backup] Created backup directory: ${dir}`);
    }
}

// ─── Database path resolution ───────────────────────────────────────────────
function resolveDbPath(): string | null {
    const dbUrl = process.env.DATABASE_URL || '';
    const candidates = [
        path.join(process.cwd(), 'prisma', 'prod.db'),
        path.join(process.cwd(), 'prisma', 'dev.db'),
    ];
    if (dbUrl.startsWith('file:')) {
        const rel = dbUrl.replace('file:', '').replace('./', '');
        candidates.unshift(path.join(process.cwd(), rel));
        candidates.unshift(path.join(process.cwd(), 'prisma', rel));
    }
    return candidates.find(p => fs.existsSync(p)) || null;
}

// ─── Core: Create a ZIP backup and save to a named file ────────────────────
async function createBackupZip(destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(destPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);

        // Database
        const dbPath = resolveDbPath();
        if (dbPath) {
            console.log(`[Backup] Adding DB: ${dbPath}`);
            archive.file(dbPath, { name: 'database.sqlite' });
        } else {
            console.warn('[Backup] Database file not found — skipping DB in backup.');
        }

        // Uploads
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (fs.existsSync(uploadsDir)) {
            console.log(`[Backup] Adding uploads directory...`);
            archive.directory(uploadsDir, 'uploads');
        }

        archive.finalize();
    });
}

// ─── Core: Restore from a zip file path ────────────────────────────────────
async function restoreFromZip(zipPath: string): Promise<void> {
    const extractDir = path.join(path.dirname(zipPath), 'extract-' + Date.now());
    fs.mkdirSync(extractDir, { recursive: true });

    // Extract (AdmZip on Windows, system unzip on Linux)
    if (process.platform === 'win32') {
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(extractDir, true);
    } else {
        await new Promise<void>((resolve, reject) => {
            const { exec } = require('child_process');
            exec(`unzip -o -q "${zipPath}" -d "${extractDir}"`, (err: any) => {
                err ? reject(err) : resolve();
            });
        });
    }

    // Restore uploads
    const sourceUploads = path.join(extractDir, 'uploads');
    if (fs.existsSync(sourceUploads)) {
        const targetUploads = path.join(process.cwd(), 'uploads');
        try {
            fs.cpSync(sourceUploads, targetUploads, { recursive: true, force: true });
            console.log('[Backup] Uploads restored.');
        } catch (e) {
            console.warn('[Backup] Uploads restore warning:', e);
        }
    }

    // Restore SQLite database (if present in backup)
    const backupDb = path.join(extractDir, 'database.sqlite');
    if (fs.existsSync(backupDb)) {
        const targetDb = resolveDbPath();
        if (targetDb) {
            // Disconnect Prisma so we can overwrite the file
            await prisma.$disconnect();
            fs.copyFileSync(backupDb, targetDb);
            console.log('[Backup] Database file restored from backup.');
            // Reconnect (Prisma will reconnect lazily on next query)
        } else {
            console.warn('[Backup] Could not locate target DB path — database not restored from file.');
        }
    }

    // Cleanup extraction directory
    try { fs.rmSync(extractDir, { recursive: true, force: true }); } catch { }
}

// ─── Keep only the last N backups (Unified) ──────────────────────────────
function pruneOldBackups(backupDir: string, keepCount = 30) {
    try {
        const files = fs.readdirSync(backupDir)
            .filter(f => f.endsWith('.zip'))
            .map(f => {
                const fullPath = path.join(backupDir, f);
                const stats = fs.statSync(fullPath);
                return { name: f, time: stats.mtime.getTime() };
            })
            .sort((a, b) => b.time - a.time); // newest first

        if (files.length > keepCount) {
            files.slice(keepCount).forEach(f => {
                fs.unlinkSync(path.join(backupDir, f.name));
                console.log(`[Backup] Pruned old backup (unified list): ${f.name}`);
            });
        }
    } catch (e) {
        console.warn('[Backup] Prune warning:', e);
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 1: POST /api/backup/save-to-disk
// Creates a backup and saves it to the BACKUP_DIR folder on disk.
// ──────────────────────────────────────────────────────────────────────────────
export const saveBackupToDisk = async (req: Request, res: Response) => {
    try {
        const { type } = req.body; // 'online' | 'offline' | 'auto'
        const backupType = type || (process.env.NODE_ENV === 'production' ? 'online' : 'offline');

        const backupDir = getBackupDir();
        ensureBackupDir(backupDir);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-${backupType}-${timestamp}.zip`;
        const destPath = path.join(backupDir, filename);

        console.log(`[Backup] Saving ${backupType} backup to: ${destPath}`);

        // CRITICAL: For SQLite in WAL mode, force checkpoint
        try {
            await prisma.$executeRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');
            console.log('[Backup] SQLite WAL checkpoint successful.');
        } catch (e) {
            console.warn('[Backup] WAL checkpoint failed:', e);
        }

        await createBackupZip(destPath);

        const stats = fs.statSync(destPath);
        const sizeKB = (stats.size / 1024).toFixed(1);

        // Prune old backups (keep last 30 total)
        pruneOldBackups(backupDir, 30);

        console.log(`[Backup] Backup saved: ${filename} (${sizeKB} KB)`);
        res.json({
            message: 'Backup saved successfully',
            filename,
            path: destPath,
            sizeKB,
            type: backupType,
            createdAt: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('[Backup] Save-to-disk error:', error);
        res.status(500).json({ message: error.message || 'Backup failed' });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 2: GET /api/backup/list-local
// Lists all backups available in BACKUP_DIR.
// ──────────────────────────────────────────────────────────────────────────────
export const listLocalBackups = async (req: Request, res: Response) => {
    try {
        const backupDir = getBackupDir();
        ensureBackupDir(backupDir);

        const files = fs.readdirSync(backupDir)
            .filter(f => f.endsWith('.zip'))
            .map(f => {
                const stats = fs.statSync(path.join(backupDir, f));
                // Infer type from filename: backup-type-timestamp.zip
                let type = 'unknown';
                if (f.startsWith('backup-online-')) type = 'online';
                else if (f.startsWith('backup-offline-')) type = 'offline';
                else if (f.startsWith('backup-auto-')) type = 'auto';
                else if (f.startsWith('auto-backup-')) type = 'auto'; // legacy

                return {
                    filename: f,
                    sizeKB: (stats.size / 1024).toFixed(1),
                    createdAt: stats.mtime.toISOString(),
                    type
                };
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // newest first

        res.json({ backupDir, backups: files });
    } catch (error: any) {
        console.error('[Backup] List error:', error);
        res.status(500).json({ message: error.message || 'Failed to list backups' });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 3: POST /api/backup/restore-from-disk
// Body: { filename: "backup-2025-01-01T00-00-00-000Z.zip" }
// Restores a backup from BACKUP_DIR without needing a file upload.
// ──────────────────────────────────────────────────────────────────────────────
export const restoreFromDisk = async (req: Request, res: Response) => {
    try {
        const { filename } = req.body;
        if (!filename) return res.status(400).json({ message: 'filename is required' });

        // Security: prevent path traversal
        if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
            return res.status(400).json({ message: 'Invalid filename' });
        }

        const backupDir = getBackupDir();
        const zipPath = path.join(backupDir, filename);

        if (!fs.existsSync(zipPath)) {
            return res.status(404).json({ message: `Backup file not found: ${filename}` });
        }

        console.log(`[Backup] Restoring from: ${zipPath}`);
        await restoreFromZip(zipPath);

        console.log('[Backup] Restore complete.');
        res.json({ message: 'Backup restored successfully. Please refresh the application.' });
    } catch (error: any) {
        console.error('[Backup] Restore-from-disk error:', error);
        res.status(500).json({ message: error.message || 'Restore failed' });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 4: GET/POST /api/backup/auto-backup-setting
// GET  → returns auto-backup enabled status
// POST → { enabled: boolean } to toggle
// ──────────────────────────────────────────────────────────────────────────────
let autoBackupEnabled = process.env.AUTO_BACKUP_ENABLED === 'true';
let cronJob: ReturnType<typeof cron.schedule> | null = null;

function startCronJob() {
    if (cronJob) { cronJob.stop(); cronJob = null; }
    if (!autoBackupEnabled) return;

    cronJob = cron.schedule('0 0 * * *', async () => {
        console.log('[AutoBackup] Running scheduled daily backup...');
        try {
            const backupDir = getBackupDir();
            ensureBackupDir(backupDir);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `backup-auto-${timestamp}.zip`;
            const destPath = path.join(backupDir, filename);

            // Force checkpoint for auto-backup too
            try { await prisma.$executeRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);'); } catch { }

            await createBackupZip(destPath);
            pruneOldBackups(backupDir, 30);
            console.log(`[AutoBackup] Daily backup saved: ${filename}`);
        } catch (err) {
            console.error('[AutoBackup] Cron job failed:', err);
        }
    }, { timezone: 'Asia/Kolkata' });

    console.log('[AutoBackup] Daily cron job scheduled (midnight IST).');
}

// Initialize cron job on server start
startCronJob();

export const getAutoBackupSetting = async (req: Request, res: Response) => {
    res.json({ enabled: autoBackupEnabled });
};

export const setAutoBackupSetting = async (req: Request, res: Response) => {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
        return res.status(400).json({ message: 'enabled must be a boolean' });
    }
    autoBackupEnabled = enabled;
    startCronJob();
    console.log(`[AutoBackup] Auto-backup ${enabled ? 'ENABLED' : 'DISABLED'}.`);
    res.json({ message: `Auto-backup ${enabled ? 'enabled' : 'disabled'}`, enabled });
};

// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 5: GET /api/backup/download/:filename
// Streams a backup file for download or cross-server transfer.
// ──────────────────────────────────────────────────────────────────────────────
export const downloadBackupFile = async (req: Request, res: Response) => {
    try {
        const { filename } = req.params;
        if (!filename) return res.status(400).json({ message: 'filename is required' });

        // Security: prevent path traversal
        if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
            return res.status(400).json({ message: 'Invalid filename' });
        }

        const backupDir = getBackupDir();
        const zipPath = path.join(backupDir, filename);

        if (!fs.existsSync(zipPath)) {
            return res.status(404).json({ message: `Backup file not found` });
        }

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        fs.createReadStream(zipPath).pipe(res);
    } catch (error: any) {
        console.error('[Backup] Download error:', error);
        res.status(500).json({ message: error.message || 'Download failed' });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 6: POST /api/backup/download-from-remote
// Body: { remoteUrl: "https://qixport.com", filename: "backup-xxx.zip", token: "jwt_token" }
// Pulls a backup from a remote instance and saves it to local disk.
// ──────────────────────────────────────────────────────────────────────────────
export const downloadBackupFromRemote = async (req: Request, res: Response) => {
    try {
        const { remoteUrl, filename, token } = req.body;
        if (!remoteUrl || !filename || !token) {
            return res.status(400).json({ message: 'remoteUrl, filename, and token are required' });
        }

        const backupDir = getBackupDir();
        ensureBackupDir(backupDir);
        const destPath = path.join(backupDir, filename);

        console.log(`[Backup] Pulling from ${remoteUrl} to ${destPath}...`);

        const response = await axios({
            method: 'get',
            url: `${remoteUrl}/api/backup/download/${filename}`,
            responseType: 'stream',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const writer = fs.createWriteStream(destPath);
        response.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        console.log(`[Backup] Successfully pulled remote backup: ${filename}`);
        res.json({ message: 'Remote backup pulled successfully', filename });
    } catch (error: any) {
        console.error('[Backup] Pull-from-remote error:', error);
        res.status(500).json({ message: error.message || 'Failed to pull remote backup' });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 7: POST /api/backup/upload-backup
// Receives a backup file (usually from a local instance) and saves it as 'offline'.
// ──────────────────────────────────────────────────────────────────────────────
export const uploadBackup = async (req: Request, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const backupDir = getBackupDir();
        ensureBackupDir(backupDir);

        // For uploads, we rename the temp file to the proper backup name
        const originalName = req.file.originalname;
        let finalFilename = originalName;

        // Force 'offline' type if transmitted from elsewhere, or keep original if it already has a type
        if (!originalName.startsWith('backup-')) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            finalFilename = `backup-offline-${timestamp}.zip`;
        }

        const destPath = path.join(backupDir, finalFilename);

        // Move file from temp to backup dir
        fs.renameSync(req.file.path, destPath);

        const stats = fs.statSync(destPath);
        const sizeKB = (stats.size / 1024).toFixed(1);

        // Prune
        pruneOldBackups(backupDir, 30);

        console.log(`[Backup] Received and stored offline backup: ${finalFilename}`);
        res.json({
            message: 'Backup uploaded and stored successfully',
            filename: finalFilename,
            sizeKB
        });
    } catch (error: any) {
        console.error('[Backup] Upload error:', error);
        res.status(500).json({ message: error.message || 'Upload failed' });
    }
};

// ──────────────────────────────────────────────────────────────────────────────
// LEGACY ENDPOINTS (kept for backward-compat with Data Sync tab)
// ──────────────────────────────────────────────────────────────────────────────

// Helper: Stream Prisma Data in Chunks to avoid OOM
class TableStream extends Readable {
    private model: any;
    private batchSize: number;
    private cursor: string | null = null;
    private isFirst: boolean = true;
    private hasStarted: boolean = false;

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
                orderBy: { id: 'asc' }
            };

            if (this.cursor) {
                params.cursor = { id: this.cursor };
                params.skip = 1;
            }

            const chunk = await this.model.findMany(params);

            if (chunk.length === 0) {
                this.push(']');
                this.push(null);
                return;
            }

            let jsonChunk = '';
            for (let i = 0; i < chunk.length; i++) {
                const record = chunk[i];
                if (!this.isFirst) { jsonChunk += ','; } else { this.isFirst = false; }
                jsonChunk += JSON.stringify(record);
                if (i === chunk.length - 1) { this.cursor = record.id; }
            }
            this.push(jsonChunk);
        } catch (error) {
            this.destroy(error as Error);
        }
    }
}

// Legacy browser-download backup (used by old Data Sync tab)
export const exportFullBackupZip = async (req: Request, res: Response) => {
    try {
        const archive = archiver('zip', { zlib: { level: 9 } });
        const filename = `purple-port-backup-${new Date().toISOString().split('T')[0]}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        archive.on('error', (err) => { console.error('[Backup] Archive error:', err); });
        archive.pipe(res);

        const addTable = (name: string, model: any) => {
            archive.append(new TableStream(model), { name: `${name}.json` });
        };

        addTable('users', prisma.user);
        addTable('staffProfiles', prisma.staffProfile);
        addTable('clients', prisma.client);
        addTable('campaigns', prisma.campaign);
        addTable('tasks', prisma.task);
        addTable('taskDependencies', prisma.taskDependency);
        addTable('assets', prisma.asset);
        addTable('comments', prisma.comment);
        addTable('timeLogs', prisma.timeLog);
        addTable('accountHeads', prisma.accountHead);
        addTable('ledgers', prisma.ledger);
        addTable('journalEntries', prisma.journalEntry);
        addTable('journalLines', prisma.journalLine);
        addTable('invoices', prisma.invoice);
        addTable('invoiceItems', prisma.invoiceItem);
        addTable('notifications', prisma.notification);
        addTable('attendanceRecords', prisma.attendanceRecord);
        addTable('leaveRequests', prisma.leaveRequest);
        addTable('holidays', prisma.holiday);
        addTable('payrollRuns', prisma.payrollRun);
        addTable('payrollSlips', prisma.payrollSlip);
        addTable('stickyNotes', prisma.stickyNote);
        addTable('stickyTasks', prisma.stickyTask);
        addTable('stickyNotePermissions', prisma.stickyNotePermission);
        addTable('adAccounts', prisma.adAccount);
        addTable('spendSnapshots', prisma.spendSnapshot);
        addTable('leads', prisma.lead);

        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (fs.existsSync(uploadsDir)) archive.directory(uploadsDir, 'uploads');

        await archive.finalize();
    } catch (error: any) {
        if (!res.headersSent) res.status(500).json({ message: `Export failed: ${error.message}` });
    }
};

// Legacy file-upload restore (used by old Data Sync tab)
export const importFullBackupZip = async (req: Request, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const zipPath = req.file.path;
        const extractDir = path.join(path.dirname(zipPath), 'extract-' + Date.now());
        fs.mkdirSync(extractDir, { recursive: true });

        const unzipWithSystem = (): Promise<void> =>
            new Promise((resolve, reject) => {
                const { exec } = require('child_process');
                exec(`unzip -o -q "${zipPath}" -d "${extractDir}"`, (error: any) => {
                    error ? reject(error) : resolve();
                });
            });

        let useAdmZip = false;
        try {
            if (process.platform === 'win32') throw new Error('Windows uses AdmZip');
            await unzipWithSystem();
        } catch { useAdmZip = true; }

        if (useAdmZip) {
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(extractDir, true);
        }

        const readJsonFile = (name: string): any[] => {
            const filePath = path.join(extractDir, `${name}.json`);
            if (!fs.existsSync(filePath)) return [];
            try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
            catch { return []; }
        };

        const sourceUploads = path.join(extractDir, 'uploads');
        if (fs.existsSync(sourceUploads)) {
            const targetUploads = path.join(process.cwd(), 'uploads');
            try { fs.cpSync(sourceUploads, targetUploads, { recursive: true, force: true }); } catch { }
        }

        await prisma.$transaction(async (tx) => {
            // Circular FK break
            await tx.user.updateMany({ data: { linked_client_id: null } as any });
            await tx.client.updateMany({ data: { account_manager_id: null } });

            // Delete in dependency order (leaves first)
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
            await tx.regularisationRequest.deleteMany();
            await tx.leaveAllocation.deleteMany();
            await tx.leaveRequest.deleteMany();
            await tx.attendanceRecord.deleteMany();
            await tx.payrollSlip.deleteMany();
            await tx.spendSnapshot.deleteMany();
            await tx.lead.deleteMany();
            await tx.launcherApp.deleteMany();
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

            const restore = async (name: string, table: any) => {
                const rows = readJsonFile(name);
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
                console.log(`[Backup] Restored ${rows.length} to ${name}`);
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
        }, { maxWait: 30000, timeout: 1800000 });

        try {
            fs.rmSync(extractDir, { recursive: true, force: true });
            if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        } catch { }

        res.json({ message: 'Full Backup restored successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Import failed' });
    }
};
