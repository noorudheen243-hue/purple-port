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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaskClearanceStats = exports.clearAllTasks = exports.clearActiveTasks = exports.resetData = exports.getStats = exports.stopTaskTimer = exports.startTaskTimer = exports.deleteTask = exports.updateTask = exports.getTask = exports.getTasks = exports.createTask = void 0;
const zod_1 = require("zod");
const taskService = __importStar(require("./service"));
const bulkOperations = __importStar(require("./bulk-operations.service"));
const createTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    campaign_id: zod_1.z.string().optional(),
    assignee_id: zod_1.z.string().optional(),
    client_id: zod_1.z.string().optional(), // Added
    category: zod_1.z.string().optional(), // Added
    content_type: zod_1.z.string().optional(), // Added: Link to Client Content Strategy
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    type: zod_1.z.enum([
        'GRAPHIC', 'VIDEO', 'MOTION', 'BRANDING', 'CONTENT_CREATION',
        'CONTENT_SHOOTING', 'WEB_DEV', 'REEL_EDITING', 'SEO', 'ADS_SETUP', 'REPORTING', 'GENERIC',
        'CONTENT', 'WEB'
    ]).default('GENERIC'),
    due_date: zod_1.z.string().optional(),
    estimated_hours: zod_1.z.number().optional(),
});
const updateTaskSchema = createTaskSchema.partial().extend({
    status: zod_1.z.enum(['PLANNED', 'ASSIGNED', 'IN_PROGRESS', 'REVIEW', 'REVISION_REQUESTED', 'COMPLETED']).optional(),
});
const isCreative = (req) => { var _a; return ((_a = req.user) === null || _a === void 0 ? void 0 : _a.department) === 'CREATIVE'; };
const createTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Create Task Payload:", JSON.stringify(req.body, null, 2)); // DEBUG LOG
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        // Removed isCreative check to allow Creative team to create tasks as per new requirements
        // if (isCreative(req)) return res.status(403).json({ message: 'Creative team cannot create tasks.' });
        const validatedData = createTaskSchema.parse(req.body);
        const { assignee_id, campaign_id, client_id, due_date } = validatedData, otherData = __rest(validatedData, ["assignee_id", "campaign_id", "client_id", "due_date"]);
        const task = yield taskService.createTask(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, otherData), { reporter: { connect: { id: req.user.id } }, assigned_by: { connect: { id: req.user.id } } }), (assignee_id ? { assignee: { connect: { id: assignee_id } } } : {})), (campaign_id ? { campaign: { connect: { id: campaign_id } } } : {})), (client_id ? { client: { connect: { id: client_id } } } : {})), { due_date: due_date ? new Date(due_date) : undefined }));
        res.status(201).json(task);
    }
    catch (error) {
        console.error("Task Creation Error:", error); // DEBUG LOG
        if (error instanceof zod_1.z.ZodError)
            res.status(400).json({ errors: error.errors });
        else
            res.status(500).json({ message: error.message });
    }
});
exports.createTask = createTask;
const getTasks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { campaign_id, assignee_id, client_id, status, priority, start_date, end_date } = req.query;
        const tasks = yield taskService.getTasks({
            campaign_id: campaign_id,
            client_id: client_id,
            assignee_id: assignee_id,
            status: status,
            priority: priority,
            startDate: start_date ? new Date(start_date) : undefined,
            endDate: end_date ? new Date(end_date) : undefined
        });
        res.json(tasks);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getTasks = getTasks;
const getTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const task = yield taskService.getTaskById(req.params.id);
        if (!task)
            return res.status(404).json({ message: 'Task not found' });
        res.json(task);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getTask = getTask;
const updateTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log("---------------- START UPDATE TASK DEBUG ----------------");
        console.log("User:", JSON.stringify(req.user, null, 2));
        console.log("Raw Body:", JSON.stringify(req.body, null, 2));
        const validatedData = updateTaskSchema.parse(req.body);
        console.log("Validated Data:", JSON.stringify(validatedData, null, 2));
        // Transform relations to Prisma Connect syntax
        const { assignee_id, campaign_id, client_id, due_date } = validatedData, rest = __rest(validatedData, ["assignee_id", "campaign_id", "client_id", "due_date"]);
        let updateData = Object.assign({}, rest);
        // Access Control: Removed Creative Team Restriction
        // All roles authorized in routes can update tasks fully
        if (assignee_id)
            updateData.assignee = { connect: { id: assignee_id } };
        if (campaign_id)
            updateData.campaign = { connect: { id: campaign_id } };
        if (client_id)
            updateData.client = { connect: { id: client_id } };
        if (due_date)
            updateData.due_date = new Date(due_date);
        console.log("Final Update Payload sent to Service:", JSON.stringify(updateData, null, 2));
        const task = yield taskService.updateTask(req.params.id, updateData, (_a = req.user) === null || _a === void 0 ? void 0 : _a.id); // Pass User ID for history logging
        console.log("Task Updated Successfully");
        res.json(task);
    }
    catch (error) {
        console.error("UPDATE TASK ERROR:", error);
        if (error instanceof zod_1.z.ZodError)
            res.status(400).json({ errors: error.errors });
        else
            res.status(500).json({ message: error.message });
    }
});
exports.updateTask = updateTask;
const deleteTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield taskService.deleteTask(req.params.id);
        res.json({ message: 'Task deleted' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteTask = deleteTask;
const startTaskTimer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const timer = yield taskService.startTimer(req.params.id, req.user.id);
        res.json(timer);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.startTaskTimer = startTaskTimer;
const stopTaskTimer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        const timer = yield taskService.stopTimer(req.params.id, req.user.id);
        res.json(timer);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.stopTaskTimer = stopTaskTimer;
const getStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user)
            return res.status(401).json({ message: "Unauthorized" });
        const { view, start, end } = req.query;
        // If 'view' matches report types, fetch Report Stats (Array)
        if (view && ['staff', 'department', 'client', 'status'].includes(view)) {
            const reportStats = yield taskService.getTaskStats({
                groupBy: view,
                startDate: start ? new Date(start) : undefined,
                endDate: end ? new Date(end) : undefined
            });
            return res.json(reportStats);
        }
        // OPTIMIZED DASHBOARD AGGREGATES
        if (view === 'aggregates') {
            const aggs = yield taskService.calculateDashboardAggregates();
            return res.json(aggs);
        }
        // Default: Dashboard Stats (Object)
        const stats = yield taskService.getDashboardStats({
            id: req.user.id,
            role: req.user.role,
            department: req.user.department
        });
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getStats = getStats;
const resetData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('RESET DATA REQUESTED');
        yield taskService.wipeAllTaskData();
        res.json({ message: "All task data wiped successfully." });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.resetData = resetData;
const clearActiveTasks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log('CLEAR ACTIVE TASKS REQUESTED by ' + ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id));
        const result = yield taskService.clearActiveTasks();
        res.json({ message: `Successfully cleared ${result.count} active tasks.` });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.clearActiveTasks = clearActiveTasks;
/**
 * Clear all tasks and related data (DEVELOPER_ADMIN only)
 * This is a destructive operation that cannot be undone
 */
const clearAllTasks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        // Only DEVELOPER_ADMIN can clear all tasks
        if (req.user.role !== 'DEVELOPER_ADMIN') {
            return res.status(403).json({
                message: 'Access denied. Only Developer Admins can clear all tasks.'
            });
        }
        const result = yield bulkOperations.clearAllTasks(req.user.id);
        res.json(result);
    }
    catch (error) {
        console.error('Error in clearAllTasks:', error);
        res.status(500).json({
            message: error.message || 'Failed to clear tasks'
        });
    }
});
exports.clearAllTasks = clearAllTasks;
/**
 * Get statistics about what will be deleted
 */
const getTaskClearanceStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (req.user.role !== 'DEVELOPER_ADMIN') {
            return res.status(403).json({
                message: 'Access denied.'
            });
        }
        const stats = yield bulkOperations.getTaskClearanceStats();
        res.json(stats);
    }
    catch (error) {
        console.error('Error in getTaskClearanceStats:', error);
        res.status(500).json({
            message: error.message || 'Failed to get stats'
        });
    }
});
exports.getTaskClearanceStats = getTaskClearanceStats;
