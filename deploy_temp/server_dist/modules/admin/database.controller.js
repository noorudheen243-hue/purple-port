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
exports.DatabaseRepairController = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class DatabaseRepairController {
    static repairDatabase(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const dbPath = path_1.default.join(process.cwd(), 'prisma', 'dev.db');
                const backupPath = `${dbPath}.backup.${Date.now()}`;
                const tempPath = `${dbPath}.temp`;
                console.log('[Database Repair] Starting repair process...');
                // Step 1: Create backup
                console.log('[1/5] Creating backup...');
                yield promises_1.default.copyFile(dbPath, backupPath);
                // Step 2: Check if database exists
                try {
                    yield promises_1.default.access(dbPath);
                }
                catch (_a) {
                    return res.status(404).json({ error: 'Database file not found' });
                }
                // Step 3: Export data
                console.log('[2/5] Exporting data...');
                const dumpPath = '/tmp/database_dump.sql';
                yield execAsync(`sqlite3 "${dbPath}" ".dump" > "${dumpPath}"`);
                // Step 4: Create new database
                console.log('[3/5] Creating new database...');
                yield execAsync(`sqlite3 "${tempPath}" < "${dumpPath}"`);
                // Step 5: Replace old database
                console.log('[4/5] Replacing database...');
                const corruptedPath = `${dbPath}.corrupted`;
                yield promises_1.default.rename(dbPath, corruptedPath);
                yield promises_1.default.rename(tempPath, dbPath);
                console.log('[5/5] Repair complete!');
                res.json({
                    success: true,
                    message: 'Database repaired successfully',
                    backup: backupPath,
                    corrupted: corruptedPath
                });
            }
            catch (error) {
                console.error('[Database Repair] Error:', error);
                res.status(500).json({
                    error: 'Repair failed',
                    message: error.message
                });
            }
        });
    }
    static checkDatabaseHealth(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const dbPath = path_1.default.join(process.cwd(), 'prisma', 'dev.db');
                const { stdout } = yield execAsync(`sqlite3 "${dbPath}" "PRAGMA integrity_check;"`);
                const isHealthy = stdout.trim() === 'ok';
                res.json({
                    healthy: isHealthy,
                    result: stdout.trim()
                });
            }
            catch (error) {
                res.status(500).json({
                    error: 'Health check failed',
                    message: error.message
                });
            }
        });
    }
}
exports.DatabaseRepairController = DatabaseRepairController;
