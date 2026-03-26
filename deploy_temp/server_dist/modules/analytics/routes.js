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
router.get('/dashboard', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'MARKETING_EXEC'), controller_1.getDashboardStats);
router.get('/team-performance', (0, middleware_1.authorize)('ADMIN', 'MANAGER'), controller_1.getTeamPerformanceStats);
router.get('/attendance', (0, middleware_1.authorize)('ADMIN', 'MANAGER'), controller_1.getAttendanceStats);
router.get('/creative-metrics', (0, middleware_1.authorize)('ADMIN', 'MANAGER'), controller_1.getCreativeMetrics);
router.get('/creative-dashboard', (0, middleware_1.authorize)('ADMIN', 'MANAGER', 'DM_EXECUTIVE', 'WEB_SEO_EXECUTIVE', 'CREATIVE_DESIGNER', 'OPERATIONS_EXECUTIVE'), controller_1.getCreativeDashboardStats);
exports.default = router;
