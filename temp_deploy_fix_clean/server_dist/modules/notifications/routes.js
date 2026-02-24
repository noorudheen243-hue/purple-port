"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controller_1 = require("./controller");
const middleware_1 = require("../auth/middleware");
const router = express_1.default.Router();
router.use(middleware_1.protect);
router.get('/', controller_1.getMyNotifications);
router.put('/:id/read', controller_1.markAsRead);
router.put('/read-all', controller_1.markAllRead);
exports.default = router;
