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
exports.initDefaults = exports.executeLocal = exports.deleteApp = exports.recordUsage = exports.togglePin = exports.createApp = exports.getApps = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const child_process_1 = require("child_process");
const DEFAULT_APPS = [
    { name: 'Gemini', icon: 'gemini', type: 'WEB', url: 'https://gemini.google.com', is_global: true },
    { name: 'ChatGPT', icon: 'chatgpt', type: 'WEB', url: 'https://chat.openai.com', is_global: true },
    { name: 'Chrome', icon: 'chrome', type: 'WEB', url: 'https://google.com', is_global: true },
    { name: 'Gmail', icon: 'gmail', type: 'WEB', url: 'https://mail.google.com', is_global: true },
    { name: 'Google Sheets', icon: 'sheets', type: 'WEB', url: 'https://docs.google.com/spreadsheets', is_global: true },
    { name: 'Notepad', icon: 'notepad', type: 'LOCAL', command: 'notepad', is_global: true },
    { name: 'Calculator', icon: 'calculator', type: 'LOCAL', command: 'calc', is_global: true },
];
const getApps = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    // 0. Auto-Seed Defaults or Fix Updates
    const globalCount = yield prisma_1.default.launcherApp.count({ where: { is_global: true } });
    // Fix: If "Excel" exists, rename to "Google Sheets" (migration logic)
    const oldExcel = yield prisma_1.default.launcherApp.findFirst({ where: { name: 'Excel', is_global: true } });
    if (oldExcel) {
        yield prisma_1.default.launcherApp.update({
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
    const oldChrome = yield prisma_1.default.launcherApp.findFirst({ where: { name: 'Chrome', is_global: true } });
    if (oldChrome && oldChrome.type === 'LOCAL') {
        yield prisma_1.default.launcherApp.update({
            where: { id: oldChrome.id },
            data: {
                type: 'WEB',
                url: 'https://google.com',
                command: null
            }
        });
    }
    // Fix: Convert Notepad to Web Tool
    const oldNotepad = yield prisma_1.default.launcherApp.findFirst({ where: { name: 'Notepad', is_global: true } });
    if (oldNotepad && oldNotepad.type === 'LOCAL') {
        yield prisma_1.default.launcherApp.update({
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
    const oldCalc = yield prisma_1.default.launcherApp.findFirst({ where: { name: 'Calculator', is_global: true } });
    if (oldCalc && oldCalc.type === 'LOCAL') {
        yield prisma_1.default.launcherApp.update({
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
        yield (0, exports.initDefaults)();
    }
    // 1. Get All Global Apps
    const globalApps = yield prisma_1.default.launcherApp.findMany({ where: { is_global: true } });
    // 2. Get User Created Apps
    const userApps = yield prisma_1.default.launcherApp.findMany({ where: { creator_id: userId } });
    // 3. Get Preferences
    const prefs = yield prisma_1.default.userLauncherPreference.findMany({ where: { user_id: userId } });
    const prefMap = new Map(prefs.map(p => [p.app_id, p]));
    // 4. Merge
    const allApps = [...globalApps, ...userApps].map(app => {
        const pref = prefMap.get(app.id);
        return Object.assign(Object.assign({}, app), { is_pinned: (pref === null || pref === void 0 ? void 0 : pref.is_pinned) || false, last_used: (pref === null || pref === void 0 ? void 0 : pref.last_used) || null, usage_count: (pref === null || pref === void 0 ? void 0 : pref.usage_count) || 0 });
    });
    // Sort: Pinned first, then Usage Count desc
    return allApps.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned)
            return -1;
        if (!a.is_pinned && b.is_pinned)
            return 1;
        return b.usage_count - a.usage_count;
    });
});
exports.getApps = getApps;
const createApp = (userId, data) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.launcherApp.create({
        data: Object.assign(Object.assign({}, data), { creator_id: userId, is_global: false })
    });
});
exports.createApp = createApp;
const togglePin = (userId, appId) => __awaiter(void 0, void 0, void 0, function* () {
    const pref = yield prisma_1.default.userLauncherPreference.findUnique({
        where: { user_id_app_id: { user_id: userId, app_id: appId } }
    });
    if (pref) {
        return yield prisma_1.default.userLauncherPreference.update({
            where: { id: pref.id },
            data: { is_pinned: !pref.is_pinned }
        });
    }
    else {
        return yield prisma_1.default.userLauncherPreference.create({
            data: {
                user_id: userId,
                app_id: appId,
                is_pinned: true
            }
        });
    }
});
exports.togglePin = togglePin;
const recordUsage = (userId, appId) => __awaiter(void 0, void 0, void 0, function* () {
    const pref = yield prisma_1.default.userLauncherPreference.findUnique({
        where: { user_id_app_id: { user_id: userId, app_id: appId } }
    });
    if (pref) {
        return yield prisma_1.default.userLauncherPreference.update({
            where: { id: pref.id },
            data: {
                usage_count: pref.usage_count + 1,
                last_used: new Date()
            }
        });
    }
    else {
        return yield prisma_1.default.userLauncherPreference.create({
            data: {
                user_id: userId,
                app_id: appId,
                usage_count: 1,
                last_used: new Date()
            }
        });
    }
});
exports.recordUsage = recordUsage;
const deleteApp = (userId, appId) => __awaiter(void 0, void 0, void 0, function* () {
    // Only allow deleting own apps
    return yield prisma_1.default.launcherApp.deleteMany({
        where: { id: appId, creator_id: userId }
    });
});
exports.deleteApp = deleteApp;
// --- OS AWARE EXECUTION (SERVER SIDE) ---
const executeLocal = (command) => __awaiter(void 0, void 0, void 0, function* () {
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
    (0, child_process_1.exec)(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
    return { success: true, message: "Command sent to host shell" };
});
exports.executeLocal = executeLocal;
const initDefaults = () => __awaiter(void 0, void 0, void 0, function* () {
    for (const app of DEFAULT_APPS) {
        const exists = yield prisma_1.default.launcherApp.findFirst({ where: { name: app.name, is_global: true } });
        if (!exists) {
            yield prisma_1.default.launcherApp.create({ data: app });
        }
    }
    return { success: true };
});
exports.initDefaults = initDefaults;
