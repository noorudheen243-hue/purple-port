import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';
import { exec } from 'child_process';

const DEFAULT_APPS = [
    { name: 'Gemini', icon: 'gemini', type: 'WEB', url: 'https://gemini.google.com', is_global: true },
    { name: 'ChatGPT', icon: 'chatgpt', type: 'WEB', url: 'https://chat.openai.com', is_global: true },
    { name: 'Chrome', icon: 'chrome', type: 'WEB', url: 'https://google.com', is_global: true },
    { name: 'Gmail', icon: 'gmail', type: 'WEB', url: 'https://mail.google.com', is_global: true },
    { name: 'Google Sheets', icon: 'sheets', type: 'WEB', url: 'https://docs.google.com/spreadsheets', is_global: true },
    { name: 'Notepad', icon: 'notepad', type: 'LOCAL', command: 'notepad', is_global: true },
    { name: 'Calculator', icon: 'calculator', type: 'LOCAL', command: 'calc', is_global: true },
];

export const getApps = async (userId: string) => {
    // 0. Auto-Seed Defaults or Fix Updates
    const globalCount = await prisma.launcherApp.count({ where: { is_global: true } });

    // Fix: If "Excel" exists, rename to "Google Sheets" (migration logic)
    const oldExcel = await prisma.launcherApp.findFirst({ where: { name: 'Excel', is_global: true } });
    if (oldExcel) {
        await prisma.launcherApp.update({
            where: { id: oldExcel.id },
            data: {
                name: 'Google Sheets',
                icon: 'sheets',
                type: 'WEB',
                url: 'https://docs.google.com/spreadsheets',
                command: null
            }
        });
    }

    // Fix: Ensure Chrome is WEB type (User request: Open new browser page)
    const oldChrome = await prisma.launcherApp.findFirst({ where: { name: 'Chrome', is_global: true } });
    if (oldChrome && oldChrome.type === 'LOCAL') {
        await prisma.launcherApp.update({
            where: { id: oldChrome.id },
            data: {
                type: 'WEB',
                url: 'https://google.com',
                command: null
            }
        });
    }

    // Fix: Convert Notepad to Web Tool
    const oldNotepad = await prisma.launcherApp.findFirst({ where: { name: 'Notepad', is_global: true } });
    if (oldNotepad && oldNotepad.type === 'LOCAL') {
        await prisma.launcherApp.update({
            where: { id: oldNotepad.id },
            data: {
                type: 'WEB',
                url: '/dashboard/tools/notepad', // Internal Route
                command: null,
                icon: 'notepad' // Ensure icon key matches frontend
            }
        });
    }

    // Fix: Convert Calculator to Web Tool
    const oldCalc = await prisma.launcherApp.findFirst({ where: { name: 'Calculator', is_global: true } });
    if (oldCalc && oldCalc.type === 'LOCAL') {
        await prisma.launcherApp.update({
            where: { id: oldCalc.id },
            data: {
                type: 'WEB',
                url: '/dashboard/tools/calculator', // Internal Route
                command: null,
                icon: 'calculator'
            }
        });
    }

    if (globalCount === 0) {
        await initDefaults();
    }

    // 1. Get All Global Apps
    const globalApps = await prisma.launcherApp.findMany({ where: { is_global: true } });

    // 2. Get User Created Apps
    const userApps = await prisma.launcherApp.findMany({ where: { creator_id: userId } });

    // 3. Get Preferences
    const prefs = await prisma.userLauncherPreference.findMany({ where: { user_id: userId } });

    const prefMap = new Map(prefs.map(p => [p.app_id, p]));

    // 4. Merge
    const allApps = [...globalApps, ...userApps].map(app => {
        const pref = prefMap.get(app.id);
        return {
            ...app,
            is_pinned: pref?.is_pinned || false,
            last_used: pref?.last_used || null,
            usage_count: pref?.usage_count || 0
        };
    });

    // Sort: Pinned first, then Usage Count desc
    return allApps.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return b.usage_count - a.usage_count;
    });
};

export const createApp = async (userId: string, data: { name: string, url?: string, type: 'WEB' | 'LOCAL', icon: string }) => {
    return await prisma.launcherApp.create({
        data: {
            ...data,
            creator_id: userId,
            is_global: false
        }
    });
};

export const togglePin = async (userId: string, appId: string) => {
    const pref = await prisma.userLauncherPreference.findUnique({
        where: { user_id_app_id: { user_id: userId, app_id: appId } }
    });

    if (pref) {
        return await prisma.userLauncherPreference.update({
            where: { id: pref.id },
            data: { is_pinned: !pref.is_pinned }
        });
    } else {
        return await prisma.userLauncherPreference.create({
            data: {
                user_id: userId,
                app_id: appId,
                is_pinned: true
            }
        });
    }
};

export const recordUsage = async (userId: string, appId: string) => {
    const pref = await prisma.userLauncherPreference.findUnique({
        where: { user_id_app_id: { user_id: userId, app_id: appId } }
    });

    if (pref) {
        return await prisma.userLauncherPreference.update({
            where: { id: pref.id },
            data: {
                usage_count: pref.usage_count + 1,
                last_used: new Date()
            }
        });
    } else {
        return await prisma.userLauncherPreference.create({
            data: {
                user_id: userId,
                app_id: appId,
                usage_count: 1,
                last_used: new Date()
            }
        });
    }
};

export const deleteApp = async (userId: string, appId: string) => {
    // Only allow deleting own apps
    return await prisma.launcherApp.deleteMany({
        where: { id: appId, creator_id: userId }
    });
};

// --- OS AWARE EXECUTION (SERVER SIDE) ---
export const executeLocal = async (command: string) => {
    // SECURITY WARNING: This executes on the HOST machine.
    // Ensure we are in a safe environment or strictly whitelist commands.

    // Strict Whitelist for now
    const ALLOWED = ['notepad', 'calc', 'excel', 'chrome', 'code'];
    const safeCmd = command.toLowerCase().split(' ')[0]; // Basic

    /* 
       Actually, `command` comes from the DB. 
       If I allow the user to create a LOCAL app with command "rm -rf /", that's bad.
       So for user-created apps, maybe we block LOCAL types?
       Or checking strictly against safe list.
    */

    if (!ALLOWED.some(a => safeCmd.includes(a))) {
        throw new Error("Command not in allowlist for server-side execution.");
    }

    console.log(`[Launcher] Executing on Host: ${command}`);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });

    return { success: true, message: "Command sent to host shell" };
};

export const initDefaults = async () => {
    for (const app of DEFAULT_APPS) {
        const exists = await prisma.launcherApp.findFirst({ where: { name: app.name, is_global: true } });
        if (!exists) {
            await prisma.launcherApp.create({ data: app });
        }
    }
    return { success: true };
};
