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
exports.getSettings = getSettings;
exports.updateSetting = updateSetting;
exports.batchUpdateSettings = batchUpdateSettings;
const prisma_1 = __importDefault(require("../../utils/prisma"));
function getSettings(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const settings = yield prisma_1.default.systemSetting.findMany();
            const settingsMap = settings.reduce((acc, curr) => {
                acc[curr.key] = curr.value;
                return acc;
            }, {});
            res.json(settingsMap);
        }
        catch (error) {
            res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
        }
    });
}
function updateSetting(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { key, value } = req.body;
        if (!key)
            return res.status(400).json({ message: 'Key is required' });
        try {
            const setting = yield prisma_1.default.systemSetting.upsert({
                where: { key },
                update: { value: String(value) },
                create: { key, value: String(value) }
            });
            res.json(setting);
        }
        catch (error) {
            res.status(500).json({ message: 'Failed to update setting', error: error.message });
        }
    });
}
function batchUpdateSettings(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { settings } = req.body; // Expecting { key: value } object
        if (!settings)
            return res.status(400).json({ message: 'Settings object is required' });
        try {
            const entries = Object.entries(settings);
            const results = yield Promise.all(entries.map(([key, value]) => prisma_1.default.systemSetting.upsert({
                where: { key },
                update: { value: String(value) },
                create: { key, value: String(value) }
            })));
            res.json({ message: 'Settings updated successfully', results });
        }
        catch (error) {
            res.status(500).json({ message: 'Failed to update settings', error: error.message });
        }
    });
}
