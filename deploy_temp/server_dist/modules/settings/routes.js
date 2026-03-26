"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controller_1 = require("./controller");
// import { authorize } from '../../middleware/auth'; // Assuming there is an authorize middleware
const router = (0, express_1.Router)();
// In a real app, we'd add authentication/authorization middleware here
// e.g., router.use(authorize(['ADMIN', 'DEVELOPER_ADMIN']));
router.get('/', controller_1.getSettings);
router.post('/', controller_1.updateSetting);
router.post('/batch', controller_1.batchUpdateSettings);
exports.default = router;
