"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const middleware_1 = require("../auth/middleware");
const roles_1 = require("../auth/roles");
const controller = __importStar(require("./controller"));
const router = express_1.default.Router();
router.use(middleware_1.protect);
router.post('/schedule', controller.scheduleMeeting);
router.get('/', controller.getMeetings);
router.get('/my-meetings', controller.getMyMeetings);
router.get('/reports', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.MANAGER), controller.getMeetingReports);
// MoM
router.post('/:id/mom', controller.submitMoM);
router.get('/:id/mom', controller.getMoM);
// Admin Inbox & Actions
router.get('/admin/inbox', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.MANAGER), controller.getAdminInbox);
router.patch('/mom/:momId/review', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.MANAGER), controller.reviewMoM);
// Edit & Delete (Admin/Manager only)
router.patch('/:id', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.MANAGER, roles_1.ROLES.DEVELOPER_ADMIN), controller.updateMeeting);
router.delete('/:id', (0, middleware_1.authorize)(roles_1.ROLES.ADMIN, roles_1.ROLES.MANAGER, roles_1.ROLES.DEVELOPER_ADMIN), controller.deleteMeeting);
// Details
router.get('/:id', controller.getMeetingDetails);
exports.default = router;
