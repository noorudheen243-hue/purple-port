import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as userService from '../users/service';
import { exec } from 'child_process';
import util from 'util';

import path from 'path';
import prisma from '../../utils/prisma';
import fs from 'fs';

const execAsync = util.promisify(exec);
import { spawn } from 'child_process';

export const syncToCloud = async (req: Request, res: Response) => {
    try {
        // Security Check: Only Developer Admin
        if (req.user?.role !== 'DEVELOPER_ADMIN' && req.user?.role !== 'ADMIN') {
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
            const child = spawn('bash', [deployScript], {
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
        const projectRoot = path.resolve(__dirname, '../../../../');
        console.log('Project Root:', projectRoot);

        const execOptions = { cwd: projectRoot };

        // 1. Git Add
        await execAsync('git add .', execOptions);

        // 2. Git Commit (Ignore error if nothing to commit)
        try {
            await execAsync('git commit -m "Auto-sync from One-Click Dashboard"', execOptions);
            console.log('Changes committed.');
        } catch (e: any) {
            if (e.stdout?.includes('nothing to commit')) {
                console.log('Nothing to commit, proceeding to push...');
            } else {
                // If clean working tree, just proceed
            }
        }

        // 3. Git Push
        // This triggers the GitHub Action setup previously
        const { stdout, stderr } = await execAsync('git push origin main', execOptions);

        console.log('Push Output:', stdout);
        if (stderr) console.error('Push Stderr:', stderr);

        res.json({
            message: 'Sync initiated successfully! The Cloud VPS will update automatically in ~2 minutes.',
            details: 'Code pushed to GitHub. GitHub Action triggered.'
        });

    } catch (error: any) {
        console.error('Sync Error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                message: 'Sync Failed. Check server logs.',
                error: error.message
            });
        }
    }
};

export const cleanupFilesOnly = async (req: Request, res: Response) => {
    try {
        // Security Check: Role
        if (req.user?.role !== 'DEVELOPER_ADMIN' && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden. Only Admins can perform cleanup.' });
        }

        console.log(`[SYSTEM CLEANUP] Authorized by ${req.user.role}`);
        console.log('Starting File Cleanup (Database records preserved)...');

        // Clear Uploads Directory (Keep database records intact)
        const uploadDir = path.join(process.cwd(), 'uploads');
        let deletedFiles = 0;

        if (fs.existsSync(uploadDir)) {
            const files = fs.readdirSync(uploadDir);
            for (const file of files) {
                const filePath = path.join(uploadDir, file);
                try {
                    if (fs.statSync(filePath).isFile()) {
                        fs.unlinkSync(filePath);
                        deletedFiles++;
                    }
                } catch (err: any) {
                    console.error(`Failed to delete file ${file}:`, err.message);
                    // Continue to next file
                }
            }
        }

        res.json({
            message: 'Cleanup Successful',
            details: `Deleted ${deletedFiles} physical files. Database records preserved.`
        });

    } catch (error: any) {
        console.error('Cleanup Error:', error);
        res.status(500).json({ message: 'Cleanup Failed', error: error.message });
    }
};

export const optimizeSystem = async (req: Request, res: Response) => {
    try {
        console.log('Starting System Optimization...');

        const tempDir = path.join(process.cwd(), 'uploads/temp');
        let deletedFiles = 0;
        let freedSpace = 0;

        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            for (const file of files) {
                const filePath = path.join(tempDir, file);
                if (fs.statSync(filePath).isFile()) {
                    const stats = fs.statSync(filePath);
                    freedSpace += stats.size;
                    fs.unlinkSync(filePath);
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

    } catch (error: any) {
        console.error('Optimization Error:', error);
        res.status(500).json({ message: 'Optimization Failed', error: error.message });
    }
};
