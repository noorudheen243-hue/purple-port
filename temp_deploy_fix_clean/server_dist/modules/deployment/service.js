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
exports.deployToVPS = void 0;
const util_1 = __importDefault(require("util"));
const child_process_1 = require("child_process");
const execPromise = util_1.default.promisify(child_process_1.exec);
// Path configuration - Using the one from previous context
// VPS Path: /var/www/antigravity
// VPS IP: 66.116.224.221
// VPS User: user (Standard on Hostinger/DigitalOcean if not root)
const deployToVPS = () => __awaiter(void 0, void 0, void 0, function* () {
    const deploymentLog = [];
    const log = (message) => {
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
        const { stdout: pushOut, stderr: pushErr } = yield execPromise('git push origin main');
        log('Git Push Output: ' + pushOut);
        if (pushErr)
            log('Git Push Stderr (Warning/Info): ' + pushErr);
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
        const { stdout: sshOut, stderr: sshErr } = yield execPromise(`ssh -o StrictHostKeyChecking=no user@66.116.224.221 "${remoteCommand}"`);
        log('Remote Output: ' + sshOut);
        if (sshErr)
            log('Remote Stderr: ' + sshErr);
        log('Deployment completed successfully.');
        return { success: true, logs: deploymentLog };
    }
    catch (error) {
        log('DEPLOYMENT FAILED: ' + error.message);
        if (error.stderr)
            log('STDERR: ' + error.stderr);
        return { success: false, logs: deploymentLog, error: error.message };
    }
});
exports.deployToVPS = deployToVPS;
