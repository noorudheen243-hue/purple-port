"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const controller_1 = require("./controller");
const middleware_1 = require("../auth/middleware");
const roles_1 = require("../auth/roles");
const router = express_1.default.Router();
router.use(middleware_1.protect); // All task routes are protected
router.route('/')
    .post(controller_1.createTask) // All staff can create
    .get(controller_1.getTasks);
router.get('/stats', controller_1.getStats);
router.delete('/reset-data', (0, middleware_1.authorize)(roles_1.ROLES.DEVELOPER_ADMIN), controller_1.resetData); // Developer Admin Only
router.delete('/clear-active', (0, middleware_1.authorize)(roles_1.ROLES.DEVELOPER_ADMIN), controller_1.clearActiveTasks); // Developer Admin Only
// Bulk operations
router.get('/bulk/stats', (0, middleware_1.authorize)(roles_1.ROLES.DEVELOPER_ADMIN), controller_1.getTaskClearanceStats); // Get deletion stats
router.post('/bulk/clear-all', (0, middleware_1.authorize)(roles_1.ROLES.DEVELOPER_ADMIN), controller_1.clearAllTasks); // Clear all tasks
// Timer routes
router.post('/:id/timer/start', controller_1.startTaskTimer);
router.post('/:id/timer/stop', controller_1.stopTaskTimer);
router.route('/:id')
    .get(controller_1.getTask)
    .patch(controller_1.updateTask) // Content restriction logic usually in service
    .put(controller_1.updateTask)
    .delete((0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.MANAGER, roles_1.ROLES.DM_EXECUTIVE, roles_1.ROLES.WEB_SEO_EXECUTIVE, roles_1.ROLES.CREATIVE_DESIGNER, roles_1.ROLES.OPERATIONS_EXECUTIVE), controller_1.deleteTask); // All staff can delete
exports.default = router;
