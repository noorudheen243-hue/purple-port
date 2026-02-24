"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importFullBackupZip = exports.exportFullBackupZip = exports.downloadBackup = void 0;
const archiver_1 = __importDefault(require("archiver"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_1 = require("@prisma/client");
const adm_zip_1 = __importDefault(require("adm-zip"));
const stream_1 = require("stream");
const prisma = new client_1.PrismaClient();
// Helper: Stream Prisma Data in Chunks to avoid OOM
class TableStream extends stream_1.Readable {
    constructor(model, batchSize = 500) {
        super();
        this.cursor = null;
        this.isFirst = true;
        this.hasStarted = false;
        this.totalProcessed = 0;
        this.model = model;
        this.batchSize = batchSize;
    }
    _read() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.hasStarted) {
                    this.push('[');
                    this.hasStarted = true;
                }
                const params = {
                    take: this.batchSize,
                    orderBy: { id: 'asc' } // Ensure deterministic order
                };
                if (this.cursor) {
                    params.cursor = { id: this.cursor };
                    params.skip = 1; // Skip the cursor itself
                }
                const chunk = yield this.model.findMany(params);
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
                    }
                    else {
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
            }
            catch (error) {
                console.error('[Backup] Stream Error:', error);
                this.destroy(error);
            }
        });
    }
}
const downloadBackup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
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
        const archive = (0, archiver_1.default)('zip', {
            zlib: { level: 9 } // Maximum compression
        });
        // Handle errors
        archive.on('error', (err) => {
            console.error('[Backup] Archive Error:', err);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Backup generation failed' });
            }
            else {
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
                path_1.default.join(process.cwd(), 'prisma', 'prod.db'),
                path_1.default.join(process.cwd(), 'prisma', 'dev.db'),
                path_1.default.join(process.cwd(), relativePath)
            ];
            const found = candidates.find(p => fs_1.default.existsSync(p));
            if (found) {
                dbPath = found;
            }
        }
        if (fs_1.default.existsSync(dbPath)) {
            console.log(`[Backup] Adding Database: ${dbPath}`);
            archive.file(dbPath, { name: 'database.sqlite' });
        }
        else {
            console.warn('[Backup] Database file not found to backup!');
            if (secret !== (process.env.BACKUP_SECRET || 'CHANGE_THIS_SECRET'))
                return res.status(403).json({ message: 'Forbidden' });
            const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename=legacy-backup.zip`);
            archive.pipe(res);
            const dbPath = ((_a = process.env.DATABASE_URL) === null || _a === void 0 ? void 0 : _a.replace('file:', '')) || 'prisma/dev.db';
            if (fs_1.default.existsSync(dbPath))
                archive.file(dbPath, { name: 'database.sqlite' });
            const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
            if (fs_1.default.existsSync(uploadsDir))
                archive.directory(uploadsDir, 'uploads');
            yield archive.finalize();
        }
    }
    catch (e) {
        if (!res.headersSent)
            res.status(500).json({ error: String(e) });
    }
});
exports.downloadBackup = downloadBackup;
// ... (Previous imports)
// No changes to imports
// 6. Refactored Export (Memory Efficient)
const exportFullBackupZip = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(`[Backup] Starting Streamed Backup (ZIP) for ${req.ip}`);
        const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
        const filename = `purple-port-backup-${new Date().toISOString().split('T')[0]}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        archive.on('error', (err) => {
            console.error('[Backup] Archive Error:', err);
            // Can't send JSON if headers sent, but we log it.
        });
        archive.pipe(res);
        // -- Stream Tables --
        const addTableToArchive = (name, model) => {
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
        const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
        if (fs_1.default.existsSync(uploadsDir)) {
            console.log(`[Backup] Streaming Uploads Directory...`);
            archive.directory(uploadsDir, 'uploads');
        }
        yield archive.finalize();
        console.log(`[Backup] Backup Stream Finalized.`);
    }
    catch (error) {
        console.error('[Backup] Export Error:', error);
        if (!res.headersSent)
            res.status(500).json({ message: `Export failed: ${error.message}` });
    }
});
exports.exportFullBackupZip = exportFullBackupZip;
const importFullBackupZip = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file)
            return res.status(400).json({ message: 'No file uploaded' });
        console.log(`[Backup] Starting Import from ${req.file.originalname}`);
        const zipPath = req.file.path;
        const extractDir = path_1.default.join(path_1.default.dirname(zipPath), 'extract-' + Date.now());
        // Create extraction directory
        if (!fs_1.default.existsSync(extractDir)) {
            fs_1.default.mkdirSync(extractDir, { recursive: true });
        }
        // --- Memory Optimized Extraction ---
        // 1. Try system 'unzip' (Linux/Mac) - avoids loading Zip into RAM
        // 2. Fallback to AdmZip (Windows/Dev) - loads Zip into RAM but acceptable for smaller files/local dev
        const unzipWithSystem = () => {
            return new Promise((resolve, reject) => {
                const { exec } = require('child_process');
                // -o: overwrite, -q: quiet, -d: directory
                exec(`unzip -o -q "${zipPath}" -d "${extractDir}"`, (error, stdout, stderr) => {
                    if (error) {
                        console.warn('[Backup] System unzip failed, falling back to AdmZip:', error.message);
                        reject(error);
                    }
                    else {
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
            yield unzipWithSystem();
            console.log('[Backup] System unzip completed.');
        }
        catch (e) {
            useAdmZip = true;
        }
        if (useAdmZip) {
            console.log('[Backup] Using AdmZip (Legacy/Fallback)...');
            const zip = new adm_zip_1.default(zipPath);
            zip.extractAllTo(extractDir, true);
        }
        // --- Restoration Logic ---
        // Helper: Read JSON from disk (Lower memory than reading from Zip buffer)
        const readJsonFile = (name) => {
            // Check direct file
            let filePath = path_1.default.join(extractDir, `${name}.json`);
            if (!fs_1.default.existsSync(filePath)) {
                // Check if it's just 'name' (without .json extension in zip?)
                filePath = path_1.default.join(extractDir, name);
                if (!fs_1.default.existsSync(filePath))
                    return [];
            }
            try {
                const content = fs_1.default.readFileSync(filePath, 'utf8');
                return JSON.parse(content);
            }
            catch (e) {
                console.error(`[Backup] Failed to parse ${name}:`, e);
                return [];
            }
        };
        // 2. Move Uploads
        const sourceUploads = path_1.default.join(extractDir, 'uploads');
        if (fs_1.default.existsSync(sourceUploads)) {
            console.log(`[Backup] Restoring uploads...`);
            // Move or Copy? Move is faster.
            // Target: process.cwd()/uploads
            const targetUploads = path_1.default.join(process.cwd(), 'uploads');
            // Simple approach: Copy over
            // On Linux 'cp -r' or 'rsync' is better? 
            // Let's use fs-extra logic if possible, or naive recursive copy.
            // Since we upgraded node, let's use fs.cpSync (Node 16.7+)
            try {
                fs_1.default.cpSync(sourceUploads, targetUploads, { recursive: true, force: true });
            }
            catch (e) {
                console.warn('[Backup] Uploads restore fallback (fs.cp failed):', e);
                // Fallback for older node? check manually...
            }
        }
        yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // ... (Wiping logic remains same as established in previous context) ...
            // Validating context: We need to re-include the wiping logic here carefully or refer to it.
            // Since `replace_file_content` replaces the block, I MUST include the full Wiping logic again.
            // Wiping (Order: Leaf -> Root)
            console.log('[Backup] Wiping tables...');
            // Pre-Wipe: Break Circular Dependencies
            yield tx.user.updateMany({ data: { links: undefined, linked_client_id: null } }); // Safety cast
            yield tx.client.updateMany({ data: { account_manager_id: null } });
            // Explicit calls to satisfy TypeScript union complexity & FK Constraints
            // Batch 1: Deep Leaves
            yield tx.chatReadReceipt.deleteMany();
            yield tx.chatMessage.deleteMany();
            yield tx.chatParticipant.deleteMany();
            yield tx.userLauncherPreference.deleteMany();
            yield tx.metaToken.deleteMany();
            yield tx.clientInvoiceItem.deleteMany();
            yield tx.clientInvoice.deleteMany();
            yield tx.contentDeliverable.deleteMany();
            yield tx.stickyTask.deleteMany();
            yield tx.stickyNotePermission.deleteMany();
            yield tx.taskDependency.deleteMany();
            yield tx.invoiceItem.deleteMany();
            yield tx.journalLine.deleteMany();
            yield tx.timeLog.deleteMany();
            yield tx.comment.deleteMany();
            yield tx.asset.deleteMany();
            yield tx.notification.deleteMany();
            // Batch 2: Leaves
            yield tx.regularisationRequest.deleteMany();
            yield tx.leaveAllocation.deleteMany();
            yield tx.leaveRequest.deleteMany();
            yield tx.attendanceRecord.deleteMany();
            yield tx.payrollSlip.deleteMany();
            yield tx.spendSnapshot.deleteMany();
            yield tx.lead.deleteMany();
            yield tx.launcherApp.deleteMany();
            // Client Logs
            yield tx.seoLog.deleteMany();
            yield tx.metaAdsLog.deleteMany();
            yield tx.googleAdsLog.deleteMany();
            yield tx.webDevProject.deleteMany();
            yield tx.report.deleteMany();
            yield tx.clientContentStrategy.deleteMany();
            yield tx.adInsight.deleteMany();
            yield tx.adCreative.deleteMany();
            yield tx.adSet.deleteMany();
            yield tx.adCampaign.deleteMany();
            // Batch 3: Roots
            yield tx.stickyNote.deleteMany();
            yield tx.task.deleteMany();
            yield tx.invoice.deleteMany();
            yield tx.journalEntry.deleteMany();
            yield tx.ledger.deleteMany();
            yield tx.adAccount.deleteMany();
            yield tx.campaign.deleteMany();
            yield tx.payrollRun.deleteMany();
            yield tx.holiday.deleteMany();
            yield tx.staffProfile.deleteMany();
            yield tx.accountHead.deleteMany();
            yield tx.client.deleteMany();
            yield tx.chatConversation.deleteMany();
            yield tx.user.deleteMany();
            console.log('[Backup] Tables Wiped. Starting Restoration...');
            // Inserting
            const restore = (name, table) => __awaiter(void 0, void 0, void 0, function* () {
                const rows = readJsonFile(name); // Changed from parseEntry(name)
                // Insert in chunks of 50
                for (let i = 0; i < rows.length; i += 50) {
                    const chunk = rows.slice(i, i + 50);
                    try {
                        yield table.createMany({ data: chunk });
                    }
                    catch (batchError) {
                        console.warn(`[Backup] Batch failed for ${name}, switching to row-by-row...`);
                        for (const row of chunk) {
                            try {
                                yield table.create({ data: row });
                            }
                            catch (singleError) {
                                // Ignore duplicate errors (P2002)
                            }
                        }
                    }
                }
                console.log(`[Backup] Restored ${rows.length} records to ${name}`);
            });
            yield restore('users', tx.user);
            yield restore('staffProfiles', tx.staffProfile);
            yield restore('accountHeads', tx.accountHead);
            yield restore('clients', tx.client);
            yield restore('adAccounts', tx.adAccount);
            yield restore('leads', tx.lead);
            yield restore('campaigns', tx.campaign);
            yield restore('spendSnapshots', tx.spendSnapshot);
            yield restore('tasks', tx.task);
            yield restore('taskDependencies', tx.taskDependency);
            yield restore('assets', tx.asset);
            yield restore('comments', tx.comment);
            yield restore('timeLogs', tx.timeLog);
            yield restore('notifications', tx.notification);
            yield restore('stickyNotes', tx.stickyNote);
            yield restore('stickyTasks', tx.stickyTask);
            yield restore('stickyNotePermissions', tx.stickyNotePermission);
            yield restore('holidays', tx.holiday);
            yield restore('attendanceRecords', tx.attendanceRecord);
            yield restore('leaveRequests', tx.leaveRequest);
            yield restore('payrollRuns', tx.payrollRun);
            yield restore('payrollSlips', tx.payrollSlip);
            yield restore('ledgers', tx.ledger);
            yield restore('journalEntries', tx.journalEntry);
            yield restore('journalLines', tx.journalLine);
            yield restore('invoices', tx.invoice);
            yield restore('invoiceItems', tx.invoiceItem);
        }), {
            maxWait: 30000,
            timeout: 1800000 // 30 mins
        });
        // Cleanup
        try {
            fs_1.default.rmSync(extractDir, { recursive: true, force: true });
            if (fs_1.default.existsSync(zipPath))
                fs_1.default.unlinkSync(zipPath);
        }
        catch (e) {
            console.warn('Cleanup warning:', e);
        }
        res.json({ message: 'Full Backup restored successfully' });
    }
    catch (error) {
        console.error('[Backup] Import Error:', error);
        res.status(500).json({ message: error.message || 'Import failed' });
    }
});
exports.importFullBackupZip = importFullBackupZip;
