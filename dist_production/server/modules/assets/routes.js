"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controller_1 = require("./controller");
const middleware_1 = require("../auth/middleware");
const upload_1 = require("../../utils/upload");
const router = express_1.default.Router();
router.use(middleware_1.protect);
router.post('/', upload_1.upload.single('file'), controller_1.uploadAsset);
router.patch('/:id/approve', (0, middleware_1.authorize)('ADMIN', 'MANAGER'), controller_1.approveAsset);
router.delete('/:id', controller_1.deleteAsset);
exports.default = router;
