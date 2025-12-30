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
exports.downloadBackup = void 0;
const archiver_1 = __importDefault(require("archiver"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const downloadBackup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            archive.append('Database file missing at time of backup', { name: 'db_missing.txt' });
        }
        // 5. Add Uploads Directory
        const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
        if (fs_1.default.existsSync(uploadsDir)) {
            console.log(`[Backup] Adding Uploads: ${uploadsDir}`);
            archive.directory(uploadsDir, 'uploads');
        }
        else {
            archive.append('Uploads directory missing', { name: 'uploads_missing.txt' });
        }
        // 6. Finalize
        yield archive.finalize();
        console.log('[Backup] Backup stream complete.');
    }
    catch (error) {
        console.error('[Backup] Critical Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: error.message });
        }
    }
});
exports.downloadBackup = downloadBackup;
