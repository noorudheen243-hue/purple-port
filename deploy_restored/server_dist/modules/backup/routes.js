"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const controller_1 = require("./controller");
const middleware_1 = require("../../modules/auth/middleware");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ dest: 'uploads/temp/' });
// ─── New Disk-Based Backup Endpoints (Developer Admin ONLY) ─────────────────
router.post('/save-to-disk', middleware_1.protect, (0, middleware_1.authorize)('DEVELOPER_ADMIN'), controller_1.saveBackupToDisk);
router.get('/list-local', middleware_1.protect, (0, middleware_1.authorize)('DEVELOPER_ADMIN'), controller_1.listLocalBackups);
router.post('/restore-from-disk', middleware_1.protect, (0, middleware_1.authorize)('DEVELOPER_ADMIN'), controller_1.restoreFromDisk);
// ─── Auto-Backup Setting ─────────────────────────────────────────────────────
router.get('/auto-backup-setting', middleware_1.protect, (0, middleware_1.authorize)('DEVELOPER_ADMIN'), controller_1.getAutoBackupSetting);
router.post('/auto-backup-setting', middleware_1.protect, (0, middleware_1.authorize)('DEVELOPER_ADMIN'), controller_1.setAutoBackupSetting);
// ─── Cross-Environment Retrieval ─────────────────────────────────────────────
router.get('/download/:filename', middleware_1.protect, (0, middleware_1.authorize)('DEVELOPER_ADMIN'), controller_1.downloadBackupFile);
router.post('/download-from-remote', middleware_1.protect, (0, middleware_1.authorize)('DEVELOPER_ADMIN'), controller_1.downloadBackupFromRemote);
router.post('/upload-to-remote', middleware_1.protect, (0, middleware_1.authorize)('DEVELOPER_ADMIN'), controller_1.uploadBackupToRemote);
router.post('/upload', middleware_1.protect, (0, middleware_1.authorize)('DEVELOPER_ADMIN'), upload.single('file'), controller_1.uploadBackup);
// ─── Legacy Endpoints (kept for backward-compat with Data Sync tab) ──────────
// GET /api/backup/export-json  → browser file download
router.get('/export-json', middleware_1.protect, (0, middleware_1.authorize)('ADMIN'), controller_1.exportFullBackupZip);
// POST /api/backup/import-json → file upload restore
router.post('/import-json', middleware_1.protect, (0, middleware_1.authorize)('ADMIN'), upload.single('file'), controller_1.importFullBackupZip);
exports.default = router;
