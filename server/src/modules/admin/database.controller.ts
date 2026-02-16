import { Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export class DatabaseRepairController {

    static async repairDatabase(req: Request, res: Response) {
        try {
            const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
            const backupPath = `${dbPath}.backup.${Date.now()}`;
            const tempPath = `${dbPath}.temp`;

            console.log('[Database Repair] Starting repair process...');

            // Step 1: Create backup
            console.log('[1/5] Creating backup...');
            await fs.copyFile(dbPath, backupPath);

            // Step 2: Check if database exists
            try {
                await fs.access(dbPath);
            } catch {
                return res.status(404).json({ error: 'Database file not found' });
            }

            // Step 3: Export data
            console.log('[2/5] Exporting data...');
            const dumpPath = '/tmp/database_dump.sql';
            await execAsync(`sqlite3 "${dbPath}" ".dump" > "${dumpPath}"`);

            // Step 4: Create new database
            console.log('[3/5] Creating new database...');
            await execAsync(`sqlite3 "${tempPath}" < "${dumpPath}"`);

            // Step 5: Replace old database
            console.log('[4/5] Replacing database...');
            const corruptedPath = `${dbPath}.corrupted`;
            await fs.rename(dbPath, corruptedPath);
            await fs.rename(tempPath, dbPath);

            console.log('[5/5] Repair complete!');

            res.json({
                success: true,
                message: 'Database repaired successfully',
                backup: backupPath,
                corrupted: corruptedPath
            });

        } catch (error: any) {
            console.error('[Database Repair] Error:', error);
            res.status(500).json({
                error: 'Repair failed',
                message: error.message
            });
        }
    }

    static async checkDatabaseHealth(req: Request, res: Response) {
        try {
            const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

            const { stdout } = await execAsync(`sqlite3 "${dbPath}" "PRAGMA integrity_check;"`);

            const isHealthy = stdout.trim() === 'ok';

            res.json({
                healthy: isHealthy,
                result: stdout.trim()
            });
        } catch (error: any) {
            res.status(500).json({
                error: 'Health check failed',
                message: error.message
            });
        }
    }
}
