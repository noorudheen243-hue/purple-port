
import util from 'util';
import { exec } from 'child_process';
import path from 'path';

const execPromise = util.promisify(exec);

// Path configuration - Using the one from previous context
// VPS Path: /var/www/antigravity
// VPS IP: 66.116.224.221
// VPS User: user (Standard on Hostinger/DigitalOcean if not root)

export const deployToVPS = async () => {
    const deploymentLog: string[] = [];

    const log = (message: string) => {
        console.log(`[DEPLOY] ${message}`);
        deploymentLog.push(`[${new Date().toISOString()}] ${message}`);
    };

    try {
        log('Starting deployment process...');

        // 1. Push Local Changes
        log('Executing: git push origin main (Local)...');
        // Ensure we are in the root directory or can push from anywhere. 
        // Assuming current working directory is server root, so usually git is in ../.git or .git
        // BUT, usually we run this from a dev machine where the whole repo is checked out.
        // We act on the REPO ROOT.

        // This command runs on the LOCAL machine (Windows)
        const { stdout: pushOut, stderr: pushErr } = await execPromise('git push origin main');
        log('Git Push Output: ' + pushOut);
        if (pushErr) log('Git Push Stderr (Warning/Info): ' + pushErr);

        log('Local push successful.');

        // 2. Trigger Remote Update via SSH
        // Command sequence:
        // - Go to directory
        // - Git pull
        // - npm install (both root/client/server or just root workspaces? Usually standard is npm install in root)
        // - Build client (if needed)
        // - Build server (if needed)
        // - Restart PM2

        // Based on "Fixing VPS Deployment Issues", the structure seems to be:
        // /var/www/antigravity
        //   - client
        //   - server
        //   - package.json (root)

        // We will assume standard build process:
        // git pull
        // npm install
        // npm run build (which should build workspaces)
        // pm2 restart all

        const remoteCommand = `cd /var/www/antigravity && git pull && npm install && npm run build && pm2 restart all`;

        log(`Executing Remote SSH Command on 66.116.224.221...`);
        log(`Command: ${remoteCommand}`);

        // Note: This relies on local machine having SSH access to 'user@66.116.224.221' without password
        const { stdout: sshOut, stderr: sshErr } = await execPromise(`ssh -o StrictHostKeyChecking=no user@66.116.224.221 "${remoteCommand}"`);

        log('Remote Output: ' + sshOut);
        if (sshErr) log('Remote Stderr: ' + sshErr);

        log('Deployment completed successfully.');

        return { success: true, logs: deploymentLog };
    } catch (error: any) {
        log('DEPLOYMENT FAILED: ' + error.message);
        if (error.stderr) log('STDERR: ' + error.stderr);
        return { success: false, logs: deploymentLog, error: error.message };
    }
};
