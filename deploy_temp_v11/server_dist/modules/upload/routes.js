"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const upload_1 = require("../../utils/upload");
const controller_1 = require("./controller");
const middleware_1 = require("../auth/middleware"); // Optional protect
const router = express_1.default.Router();
// POST /api/upload
router.post('/', middleware_1.protect, upload_1.upload.single('file'), controller_1.uploadFile);
exports.default = router;
