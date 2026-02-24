"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_controller_1 = require("./database.controller");
const middleware_1 = require("../auth/middleware");
const router = (0, express_1.Router)();
// Admin-only routes for database management
router.post('/repair-database', middleware_1.protect, (0, middleware_1.authorize)('DEVELOPER_ADMIN'), database_controller_1.DatabaseRepairController.repairDatabase);
router.get('/database-health', middleware_1.protect, (0, middleware_1.authorize)('DEVELOPER_ADMIN', 'ADMIN'), database_controller_1.DatabaseRepairController.checkDatabaseHealth);
exports.default = router;
