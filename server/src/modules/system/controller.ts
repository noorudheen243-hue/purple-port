import { Request, Response } from 'express';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export const syncToCloud = async (req: Request, res: Response) => {
    try {
        // Security Check: Only Developer Admin
        if (req.user?.role !== 'DEVELOPER_ADMIN') {
            return res.status(403).json({ message: 'Forbidden. Only Developer Admins can perform deployments.' });
        }

        console.log('Starting One-Click Sync...');

        // 1. Git Add
        await execAsync('git add .');

        // 2. Git Commit (Ignore error if nothing to commit)
        try {
            await execAsync('git commit -m "Auto-sync from One-Click Dashboard"');
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
        const { stdout, stderr } = await execAsync('git push origin main');

        console.log('Push Output:', stdout);
        if (stderr) console.error('Push Stderr:', stderr);

        res.json({
            message: 'Sync initiated successfully! The Cloud VPS will update automatically in ~2 minutes.',
            details: 'Code pushed to GitHub. GitHub Action triggered.'
        });

    } catch (error: any) {
        console.error('Sync Error:', error);
        res.status(500).json({
            message: 'Sync Failed. Check server logs.',
            error: error.message
        });
    }
};
