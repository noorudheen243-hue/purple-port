import { Request, Response } from 'express';
import { exec } from 'child_process';
import util from 'util';

import path from 'path';

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
