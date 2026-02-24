"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const controller_1 = require("./controller");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ dest: 'uploads/temp/' });
const middleware_1 = require("../../modules/auth/middleware");
// GET /api/backup/download?secret=XYZ (Legacy/External)
router.get('/download', controller_1.downloadBackup);
// JSON Sync Endpoints (Admin Only)
router.get('/export-json', middleware_1.protect, (0, middleware_1.authorize)('ADMIN'), controller_1.exportFullBackupZip);
router.post('/import-json', middleware_1.protect, (0, middleware_1.authorize)('ADMIN'), upload.single('file'), controller_1.importFullBackupZip);
exports.default = router;
