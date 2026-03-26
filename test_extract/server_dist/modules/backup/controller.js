"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.importFullBackupZip = exports.exportFullBackupZip = exports.uploadBackup = exports.uploadBackupToRemote = exports.downloadBackupFromRemote = exports.downloadBackupFile = exports.setAutoBackupSetting = exports.getAutoBackupSetting = exports.restoreFromDisk = exports.listLocalBackups = exports.saveBackupToDisk = void 0;
const archiver_1 = __importDefault(require("archiver"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const client_1 = require("@prisma/client");
const adm_zip_1 = __importDefault(require("adm-zip"));
const stream_1 = require("stream");
const cron = __importStar(require("node-cron"));
const axios_1 = __importDefault(require("axios"));
const prisma = new client_1.PrismaClient();
// ─── Backup Directory Resolution ───────────────────────────────────────────────
// Windows (localhost): F:\Antigravity\Backup
// Linux (VPS):         /var/backups/antigravity
function getBackupDir() {
    if (process.env.BACKUP_DIR)
        return process.env.BACKUP_DIR;
    return process.platform === 'win32'
        ? 'F:\\Antigravity\\Backup'
        : '/var/backups/antigravity';
}
function ensureBackupDir(dir) {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
        console.log(`[Backup] Created backup directory: ${dir}`);
    }
}
// ─── Database path resolution ───────────────────────────────────────────────
function resolveDbPath() {
    const dbUrl = process.env.DATABASE_URL || '';
    const candidates = [
        path_1.default.join(process.cwd(), 'prisma', 'prod.db'),
        path_1.default.join(process.cwd(), 'prisma', 'dev.db'),
    ];
    if (dbUrl.startsWith('file:')) {
        const rel = dbUrl.replace('file:', '').replace('./', '');
        candidates.unshift(path_1.default.join(process.cwd(), rel));
        candidates.unshift(path_1.default.join(process.cwd(), 'prisma', rel));
    }
    return candidates.find(p => fs_1.default.existsSync(p)) || null;
}
// ─── Core: Create a ZIP backup and save to a named file ────────────────────
function createBackupZip(destPath) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const output = fs_1.default.createWriteStream(destPath);
            const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
            output.on('close', resolve);
            archive.on('error', reject);
            archive.pipe(output);
            // Database
            const dbPath = resolveDbPath();
            if (dbPath) {
                console.log(`[Backup] Adding DB: ${dbPath}`);
                archive.file(dbPath, { name: 'database.sqlite' });
            }
            else {
                console.warn('[Backup] Database file not found — skipping DB in backup.');
            }
            // Uploads
            const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
            if (fs_1.default.existsSync(uploadsDir)) {
                console.log(`[Backup] Adding uploads directory...`);
                archive.directory(uploadsDir, 'uploads');
            }
            archive.finalize();
        });
    });
}
// ─── Core: Restore from a zip file path ────────────────────────────────────
function restoreFromZip(zipPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const extractDir = path_1.default.join(path_1.default.dirname(zipPath), 'extract-' + Date.now());
        fs_1.default.mkdirSync(extractDir, { recursive: true });
        // Extract (AdmZip on Windows, system unzip on Linux)
        if (process.platform === 'win32') {
            const zip = new adm_zip_1.default(zipPath);
            zip.extractAllTo(extractDir, true);
        }
        else {
            yield new Promise((resolve, reject) => {
                const { exec } = require('child_process');
                exec(`unzip -o -q "${zipPath}" -d "${extractDir}"`, (err) => {
                    err ? reject(err) : resolve();
                });
            });
        }
        // Restore uploads
        const sourceUploads = path_1.default.join(extractDir, 'uploads');
        if (fs_1.default.existsSync(sourceUploads)) {
            const targetUploads = path_1.default.join(process.cwd(), 'uploads');
            try {
                fs_1.default.cpSync(sourceUploads, targetUploads, { recursive: true, force: true });
                console.log('[Backup] Uploads restored.');
            }
            catch (e) {
                console.warn('[Backup] Uploads restore warning:', e);
            }
        }
        // Restore SQLite database (if present in backup)
        const backupDb = path_1.default.join(extractDir, 'database.sqlite');
        if (fs_1.default.existsSync(backupDb)) {
            const targetDb = resolveDbPath();
            if (targetDb) {
                // Disconnect Prisma so we can overwrite the file
                yield prisma.$disconnect();
                fs_1.default.copyFileSync(backupDb, targetDb);
                console.log('[Backup] Database file restored from backup.');
                // Reconnect (Prisma will reconnect lazily on next query)
            }
            else {
                console.warn('[Backup] Could not locate target DB path — database not restored from file.');
            }
        }
        // Cleanup extraction directory
        try {
            fs_1.default.rmSync(extractDir, { recursive: true, force: true });
        }
        catch (_a) { }
    });
}
// ─── Keep only the last N backups (Unified) ──────────────────────────────
function pruneOldBackups(backupDir, keepCount = 30) {
    try {
        const files = fs_1.default.readdirSync(backupDir)
            .filter(f => f.endsWith('.zip'))
            .map(f => {
            const fullPath = path_1.default.join(backupDir, f);
            const stats = fs_1.default.statSync(fullPath);
            return { name: f, time: stats.mtime.getTime() };
        })
            .sort((a, b) => b.time - a.time); // newest first
        if (files.length > keepCount) {
            files.slice(keepCount).forEach(f => {
                fs_1.default.unlinkSync(path_1.default.join(backupDir, f.name));
                console.log(`[Backup] Pruned old backup (unified list): ${f.name}`);
            });
        }
    }
    catch (e) {
        console.warn('[Backup] Prune warning:', e);
    }
}
// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 1: POST /api/backup/save-to-disk
// Creates a backup and saves it to the BACKUP_DIR folder on disk.
// ──────────────────────────────────────────────────────────────────────────────
const saveBackupToDisk = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { type } = req.body; // 'online' | 'offline' | 'auto'
        const backupType = type || (process.env.NODE_ENV === 'production' ? 'online' : 'offline');
        const backupDir = getBackupDir();
        ensureBackupDir(backupDir);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-${backupType}-${timestamp}.zip`;
        const destPath = path_1.default.join(backupDir, filename);
        console.log(`[Backup] Saving ${backupType} backup to: ${destPath}`);
        // CRITICAL: For SQLite in WAL mode, force checkpoint
        try {
            yield prisma.$executeRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');
            console.log('[Backup] SQLite WAL checkpoint successful.');
        }
        catch (e) {
            console.warn('[Backup] WAL checkpoint failed:', e);
        }
        yield createBackupZip(destPath);
        const stats = fs_1.default.statSync(destPath);
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
    }
    catch (error) {
        console.error('[Backup] Save-to-disk error:', error);
        res.status(500).json({ message: error.message || 'Backup failed' });
    }
});
exports.saveBackupToDisk = saveBackupToDisk;
// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 2: GET /api/backup/list-local
// Lists all backups available in BACKUP_DIR.
// ──────────────────────────────────────────────────────────────────────────────
const listLocalBackups = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const backupDir = getBackupDir();
        ensureBackupDir(backupDir);
        const files = fs_1.default.readdirSync(backupDir)
            .filter(f => f.endsWith('.zip'))
            .map(f => {
            const stats = fs_1.default.statSync(path_1.default.join(backupDir, f));
            // Infer type from filename: backup-type-timestamp.zip
            let type = 'unknown';
            if (f.startsWith('backup-online-'))
                type = 'online';
            else if (f.startsWith('backup-offline-'))
                type = 'offline';
            else if (f.startsWith('backup-auto-'))
                type = 'auto';
            else if (f.startsWith('auto-backup-'))
                type = 'auto'; // legacy
            return {
                filename: f,
                sizeKB: (stats.size / 1024).toFixed(1),
                createdAt: stats.mtime.toISOString(),
                type
            };
        })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // newest first
        res.json({ backupDir, backups: files });
    }
    catch (error) {
        console.error('[Backup] List error:', error);
        res.status(500).json({ message: error.message || 'Failed to list backups' });
    }
});
exports.listLocalBackups = listLocalBackups;
// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 3: POST /api/backup/restore-from-disk
// Body: { filename: "backup-2025-01-01T00-00-00-000Z.zip" }
// Restores a backup from BACKUP_DIR without needing a file upload.
// ──────────────────────────────────────────────────────────────────────────────
const restoreFromDisk = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filename } = req.body;
        if (!filename)
            return res.status(400).json({ message: 'filename is required' });
        // Security: prevent path traversal
        if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
            return res.status(400).json({ message: 'Invalid filename' });
        }
        const backupDir = getBackupDir();
        const zipPath = path_1.default.join(backupDir, filename);
        if (!fs_1.default.existsSync(zipPath)) {
            return res.status(404).json({ message: `Backup file not found: ${filename}` });
        }
        console.log(`[Backup] Restoring from: ${zipPath}`);
        yield restoreFromZip(zipPath);
        console.log('[Backup] Restore complete.');
        res.json({ message: 'Backup restored successfully. Please refresh the application.' });
    }
    catch (error) {
        console.error('[Backup] Restore-from-disk error:', error);
        res.status(500).json({ message: error.message || 'Restore failed' });
    }
});
exports.restoreFromDisk = restoreFromDisk;
// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 4: GET/POST /api/backup/auto-backup-setting
// GET  → returns auto-backup enabled status
// POST → { enabled: boolean } to toggle
// ──────────────────────────────────────────────────────────────────────────────
let autoBackupEnabled = process.env.AUTO_BACKUP_ENABLED === 'true';
let cronJob = null;
function startCronJob() {
    if (cronJob) {
        cronJob.stop();
        cronJob = null;
    }
    if (!autoBackupEnabled)
        return;
    cronJob = cron.schedule('0 0 * * *', () => __awaiter(this, void 0, void 0, function* () {
        console.log('[AutoBackup] Running scheduled daily backup...');
        try {
            const backupDir = getBackupDir();
            ensureBackupDir(backupDir);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `backup-auto-${timestamp}.zip`;
            const destPath = path_1.default.join(backupDir, filename);
            // Force checkpoint for auto-backup too
            try {
                yield prisma.$executeRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');
            }
            catch (_a) { }
            yield createBackupZip(destPath);
            pruneOldBackups(backupDir, 30);
            console.log(`[AutoBackup] Daily backup saved: ${filename}`);
        }
        catch (err) {
            console.error('[AutoBackup] Cron job failed:', err);
        }
    }), { timezone: 'Asia/Kolkata' });
    console.log('[AutoBackup] Daily cron job scheduled (midnight IST).');
}
// Initialize cron job on server start
startCronJob();
const getAutoBackupSetting = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json({ enabled: autoBackupEnabled });
});
exports.getAutoBackupSetting = getAutoBackupSetting;
const setAutoBackupSetting = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
        return res.status(400).json({ message: 'enabled must be a boolean' });
    }
    autoBackupEnabled = enabled;
    startCronJob();
    console.log(`[AutoBackup] Auto-backup ${enabled ? 'ENABLED' : 'DISABLED'}.`);
    res.json({ message: `Auto-backup ${enabled ? 'enabled' : 'disabled'}`, enabled });
});
exports.setAutoBackupSetting = setAutoBackupSetting;
// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 5: GET /api/backup/download/:filename
// Streams a backup file for download or cross-server transfer.
// ──────────────────────────────────────────────────────────────────────────────
const downloadBackupFile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filename } = req.params;
        if (!filename)
            return res.status(400).json({ message: 'filename is required' });
        // Security: prevent path traversal
        if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
            return res.status(400).json({ message: 'Invalid filename' });
        }
        const backupDir = getBackupDir();
        const zipPath = path_1.default.join(backupDir, filename);
        if (!fs_1.default.existsSync(zipPath)) {
            return res.status(404).json({ message: `Backup file not found` });
        }
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        fs_1.default.createReadStream(zipPath).pipe(res);
    }
    catch (error) {
        console.error('[Backup] Download error:', error);
        res.status(500).json({ message: error.message || 'Download failed' });
    }
});
exports.downloadBackupFile = downloadBackupFile;
// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 6: POST /api/backup/download-from-remote
// Body: { remoteUrl: "https://qixport.com", filename: "backup-xxx.zip", token: "jwt_token" }
// Pulls a backup from a remote instance and saves it to local disk.
// ──────────────────────────────────────────────────────────────────────────────
const downloadBackupFromRemote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { remoteUrl, filename } = req.body;
        let token = req.cookies.jwt;
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!remoteUrl || !filename || !token) {
            return res.status(400).json({ message: 'remoteUrl, filename, and authentication token are required' });
        }
        const backupDir = getBackupDir();
        ensureBackupDir(backupDir);
        const destPath = path_1.default.join(backupDir, filename);
        console.log(`[Backup] Pulling from ${remoteUrl} to ${destPath}...`);
        const response = yield (0, axios_1.default)({
            method: 'get',
            url: `${remoteUrl}/api/backup/download/${filename}`,
            responseType: 'stream',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const writer = fs_1.default.createWriteStream(destPath);
        response.data.pipe(writer);
        yield new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
        console.log(`[Backup] Successfully pulled remote backup: ${filename}`);
        res.json({ message: 'Remote backup pulled successfully', filename });
    }
    catch (error) {
        console.error('[Backup] Pull-from-remote error:', error);
        res.status(500).json({ message: error.message || 'Failed to pull remote backup' });
    }
});
exports.downloadBackupFromRemote = downloadBackupFromRemote;
// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 6.5: POST /api/backup/upload-to-remote
// Body: { remoteUrl: "https://qixport.com", filename: "backup-offline-xxx.zip", token: "jwt_token" }
// Streams a local backup file to a remote instance's upload endpoint.
// ──────────────────────────────────────────────────────────────────────────────
const uploadBackupToRemote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('[Backup] uploadBackupToRemote payload:', req.body);
        const { remoteUrl, filename } = req.body;
        let token = req.cookies.jwt;
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!remoteUrl || !filename || !token) {
            return res.status(400).json({ message: 'remoteUrl, filename, and authentication token are required' });
        }
        // Security: prevent path traversal
        if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
            return res.status(400).json({ message: 'Invalid filename' });
        }
        const backupDir = getBackupDir();
        const zipPath = path_1.default.join(backupDir, filename);
        if (!fs_1.default.existsSync(zipPath)) {
            return res.status(404).json({ message: `Backup file not found: ${filename}` });
        }
        const targetUrl = `${remoteUrl}/api/backup/upload`;
        console.log(`[Backup] Pushing local backup: ${filename} to ${targetUrl}...`);
        const FormData = require('form-data');
        const form = new FormData();
        form.append('file', fs_1.default.createReadStream(zipPath), filename);
        yield axios_1.default.post(targetUrl, form, {
            headers: Object.assign(Object.assign({}, form.getHeaders()), { 'Authorization': `Bearer ${token}` }),
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });
        console.log(`[Backup] Successfully pushed backup to remote: ${filename}`);
        res.json({ message: 'Backup successfully uploaded to remote server', filename });
    }
    catch (error) {
        console.error('[Backup] Upload-to-remote error:', error);
        res.status(500).json({ message: error.message || 'Failed to upload backup to remote server' });
    }
});
exports.uploadBackupToRemote = uploadBackupToRemote;
// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT 7: POST /api/backup/upload-backup
// Receives a backup file (usually from a local instance) and saves it as 'offline'.
// ──────────────────────────────────────────────────────────────────────────────
const uploadBackup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file)
            return res.status(400).json({ message: 'No file uploaded' });
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
        const destPath = path_1.default.join(backupDir, finalFilename);
        // Move file from temp to backup dir
        fs_1.default.renameSync(req.file.path, destPath);
        const stats = fs_1.default.statSync(destPath);
        const sizeKB = (stats.size / 1024).toFixed(1);
        // Prune
        pruneOldBackups(backupDir, 30);
        console.log(`[Backup] Received and stored offline backup: ${finalFilename}`);
        res.json({
            message: 'Backup uploaded and stored successfully',
            filename: finalFilename,
            sizeKB
        });
    }
    catch (error) {
        console.error('[Backup] Upload error:', error);
        res.status(500).json({ message: error.message || 'Upload failed' });
    }
});
exports.uploadBackup = uploadBackup;
// ──────────────────────────────────────────────────────────────────────────────
// LEGACY ENDPOINTS (kept for backward-compat with Data Sync tab)
// ──────────────────────────────────────────────────────────────────────────────
// Helper: Stream Prisma Data in Chunks to avoid OOM
class TableStream extends stream_1.Readable {
    constructor(model, batchSize = 500) {
        super();
        this.cursor = null;
        this.isFirst = true;
        this.hasStarted = false;
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
                    orderBy: { id: 'asc' }
                };
                if (this.cursor) {
                    params.cursor = { id: this.cursor };
                    params.skip = 1;
                }
                const chunk = yield this.model.findMany(params);
                if (chunk.length === 0) {
                    this.push(']');
                    this.push(null);
                    return;
                }
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
                    if (i === chunk.length - 1) {
                        this.cursor = record.id;
                    }
                }
                this.push(jsonChunk);
            }
            catch (error) {
                this.destroy(error);
            }
        });
    }
}
// Legacy browser-download backup (used by old Data Sync tab)
const exportFullBackupZip = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
        const filename = `purple-port-backup-${new Date().toISOString().split('T')[0]}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        archive.on('error', (err) => { console.error('[Backup] Archive error:', err); });
        archive.pipe(res);
        const addTable = (name, model) => {
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
        const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
        if (fs_1.default.existsSync(uploadsDir))
            archive.directory(uploadsDir, 'uploads');
        yield archive.finalize();
    }
    catch (error) {
        if (!res.headersSent)
            res.status(500).json({ message: `Export failed: ${error.message}` });
    }
});
exports.exportFullBackupZip = exportFullBackupZip;
// Legacy file-upload restore (used by old Data Sync tab)
const importFullBackupZip = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file)
            return res.status(400).json({ message: 'No file uploaded' });
        const zipPath = req.file.path;
        const extractDir = path_1.default.join(path_1.default.dirname(zipPath), 'extract-' + Date.now());
        fs_1.default.mkdirSync(extractDir, { recursive: true });
        const unzipWithSystem = () => new Promise((resolve, reject) => {
            const { exec } = require('child_process');
            exec(`unzip -o -q "${zipPath}" -d "${extractDir}"`, (error) => {
                error ? reject(error) : resolve();
            });
        });
        let useAdmZip = false;
        try {
            if (process.platform === 'win32')
                throw new Error('Windows uses AdmZip');
            yield unzipWithSystem();
        }
        catch (_a) {
            useAdmZip = true;
        }
        if (useAdmZip) {
            const zip = new adm_zip_1.default(zipPath);
            zip.extractAllTo(extractDir, true);
        }
        const readJsonFile = (name) => {
            const filePath = path_1.default.join(extractDir, `${name}.json`);
            if (!fs_1.default.existsSync(filePath))
                return [];
            try {
                return JSON.parse(fs_1.default.readFileSync(filePath, 'utf8'));
            }
            catch (_a) {
                return [];
            }
        };
        const sourceUploads = path_1.default.join(extractDir, 'uploads');
        if (fs_1.default.existsSync(sourceUploads)) {
            const targetUploads = path_1.default.join(process.cwd(), 'uploads');
            try {
                fs_1.default.cpSync(sourceUploads, targetUploads, { recursive: true, force: true });
            }
            catch (_b) { }
        }
        yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Circular FK break
            yield tx.user.updateMany({ data: { linked_client_id: null } });
            yield tx.client.updateMany({ data: { account_manager_id: null } });
            // Delete in dependency order (leaves first)
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
            yield tx.regularisationRequest.deleteMany();
            yield tx.leaveAllocation.deleteMany();
            yield tx.leaveRequest.deleteMany();
            yield tx.attendanceRecord.deleteMany();
            yield tx.payrollSlip.deleteMany();
            yield tx.spendSnapshot.deleteMany();
            yield tx.lead.deleteMany();
            yield tx.launcherApp.deleteMany();
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
            const restore = (name, table) => __awaiter(void 0, void 0, void 0, function* () {
                const rows = readJsonFile(name);
                for (let i = 0; i < rows.length; i += 50) {
                    const chunk = rows.slice(i, i + 50);
                    try {
                        yield table.createMany({ data: chunk });
                    }
                    catch (_a) {
                        for (const row of chunk) {
                            try {
                                yield table.create({ data: row });
                            }
                            catch (_b) { }
                        }
                    }
                }
                console.log(`[Backup] Restored ${rows.length} to ${name}`);
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
        }), { maxWait: 30000, timeout: 1800000 });
        try {
            fs_1.default.rmSync(extractDir, { recursive: true, force: true });
            if (fs_1.default.existsSync(zipPath))
                fs_1.default.unlinkSync(zipPath);
        }
        catch (_c) { }
        res.json({ message: 'Full Backup restored successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Import failed' });
    }
});
exports.importFullBackupZip = importFullBackupZip;
