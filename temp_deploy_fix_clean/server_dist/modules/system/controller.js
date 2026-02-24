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
exports.optimizeSystem = exports.cleanupFilesOnly = exports.syncToCloud = void 0;
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const execAsync = util_1.default.promisify(child_process_1.exec);
const child_process_2 = require("child_process");
const syncToCloud = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        // Security Check: Only Developer Admin
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'DEVELOPER_ADMIN' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden. Only Developer Admins & Admins can perform deployments.' });
        }
        const isProduction = process.env.NODE_ENV === 'production';
        console.log('System Action Triggered. Mode:', isProduction ? 'Production (Update)' : 'Dev (Sync)');
        if (isProduction) {
            // PRODUCTION: PULL UPDATES
            // We need to run the deploy script.
            // CAUTION: This script kills the server. We must send response FIRST.
            res.json({
                message: 'System Update Initiated. Server will restart in a few seconds.',
                details: 'Pulling latest code and restarting services.'
            });
            // Run script detached
            const deployScript = '/root/purple-port/deploy_update.sh';
            // We use spawn to fire and forget (mostly), but we want it to survive the parent death if possible.
            // Actually, if this process dies, spawn might too unless detached.
            const child = (0, child_process_2.spawn)('bash', [deployScript], {
                detached: true,
                stdio: 'ignore'
            });
            child.unref();
            return;
        }
        // DEVELOPMENT: PUSH UPDATES
        console.log('Starting One-Click Sync (Dev -> Cloud)...');
        // Resolve Project Root (Go up from src/modules/system/controller.ts -> system -> modules -> src -> server -> ROOT)
        // If running from dist, structure is same: dist/modules/system/controller.js -> ... -> ROOT
        const projectRoot = path_1.default.resolve(__dirname, '../../../../');
        console.log('Project Root:', projectRoot);
        const execOptions = { cwd: projectRoot };
        // 1. Git Add
        yield execAsync('git add .', execOptions);
        // 2. Git Commit (Ignore error if nothing to commit)
        try {
            yield execAsync('git commit -m "Auto-sync from One-Click Dashboard"', execOptions);
            console.log('Changes committed.');
        }
        catch (e) {
            if ((_c = e.stdout) === null || _c === void 0 ? void 0 : _c.includes('nothing to commit')) {
                console.log('Nothing to commit, proceeding to push...');
            }
            else {
                // If clean working tree, just proceed
            }
        }
        // 3. Git Push
        // This triggers the GitHub Action setup previously
        const { stdout, stderr } = yield execAsync('git push origin main', execOptions);
        console.log('Push Output:', stdout);
        if (stderr)
            console.error('Push Stderr:', stderr);
        res.json({
            message: 'Sync initiated successfully! The Cloud VPS will update automatically in ~2 minutes.',
            details: 'Code pushed to GitHub. GitHub Action triggered.'
        });
    }
    catch (error) {
        console.error('Sync Error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                message: 'Sync Failed. Check server logs.',
                error: error.message
            });
        }
    }
});
exports.syncToCloud = syncToCloud;
const cleanupFilesOnly = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // Security Check: Role
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'DEVELOPER_ADMIN' && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden. Only Admins can perform cleanup.' });
        }
        console.log(`[SYSTEM CLEANUP] Authorized by ${req.user.role}`);
        console.log('Starting File Cleanup (Database records preserved)...');
        // Clear Uploads Directory (Keep database records intact)
        const uploadDir = path_1.default.join(process.cwd(), 'uploads');
        let deletedFiles = 0;
        if (fs_1.default.existsSync(uploadDir)) {
            const files = fs_1.default.readdirSync(uploadDir);
            for (const file of files) {
                const filePath = path_1.default.join(uploadDir, file);
                try {
                    if (fs_1.default.statSync(filePath).isFile()) {
                        fs_1.default.unlinkSync(filePath);
                        deletedFiles++;
                    }
                }
                catch (err) {
                    console.error(`Failed to delete file ${file}:`, err.message);
                    // Continue to next file
                }
            }
        }
        res.json({
            message: 'Cleanup Successful',
            details: `Deleted ${deletedFiles} physical files. Database records preserved.`
        });
    }
    catch (error) {
        console.error('Cleanup Error:', error);
        res.status(500).json({ message: 'Cleanup Failed', error: error.message });
    }
});
exports.cleanupFilesOnly = cleanupFilesOnly;
const optimizeSystem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Starting System Optimization...');
        const tempDir = path_1.default.join(process.cwd(), 'uploads/temp');
        let deletedFiles = 0;
        let freedSpace = 0;
        if (fs_1.default.existsSync(tempDir)) {
            const files = fs_1.default.readdirSync(tempDir);
            for (const file of files) {
                const filePath = path_1.default.join(tempDir, file);
                if (fs_1.default.statSync(filePath).isFile()) {
                    const stats = fs_1.default.statSync(filePath);
                    freedSpace += stats.size;
                    fs_1.default.unlinkSync(filePath);
                    deletedFiles++;
                }
            }
        }
        // Optional: Trigger Garbage Collection if available
        if (global.gc) {
            global.gc();
            console.log('Garbage collection triggered.');
        }
        const freedSpaceMB = (freedSpace / (1024 * 1024)).toFixed(2);
        res.json({
            message: 'Optimization Successful',
            details: `Cleared ${deletedFiles} temporary files. Freed ${freedSpaceMB} MB.`
        });
    }
    catch (error) {
        console.error('Optimization Error:', error);
        res.status(500).json({ message: 'Optimization Failed', error: error.message });
    }
});
exports.optimizeSystem = optimizeSystem;
