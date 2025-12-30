"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.updateTask = exports.getTaskById = exports.getTasks = exports.createTask = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const service_1 = require("../notifications/service");
// Helper to calculate SLA
const calculateSLA = (priority = 'MEDIUM') => {
    const now = new Date();
    const hours = {
        'URGENT': 24,
        'HIGH': 48,
        'MEDIUM': 72,
        'LOW': 168 // 1 week
    }[priority] || 72;
    return new Date(now.getTime() + hours * 60 * 60 * 1000);
};
const createTask = (data) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const createData = Object.assign({}, data);
    // 0. STRICT VALIDATION (Agency Master Prompt Phase 2)
    if (!createData.title)
        throw new Error("Task Title is required.");
    // Default Category & Nature if missing (Safety Net)
    // Cast to any to assume fields exist in new client
    if (!createData.category)
        createData.category = 'CAMPAIGN';
    if (!createData.nature)
        createData.nature = 'NEW';
    const isCampaignTask = createData.category === 'CAMPAIGN';
    // Campaign is strictly required ONLY for Campaign Tasks.
    if (isCampaignTask && !((_b = (_a = createData.campaign) === null || _a === void 0 ? void 0 : _a.connect) === null || _b === void 0 ? void 0 : _b.id)) {
        throw new Error("Campaign Task MUST be linked to a Campaign.");
    }
    // 1. Hierarchy & Automation (Auto-Assign from Campaign)
    if ((_d = (_c = createData.campaign) === null || _c === void 0 ? void 0 : _c.connect) === null || _d === void 0 ? void 0 : _d.id) {
        const campaign = yield prisma_1.default.campaign.findUnique({
            where: { id: createData.campaign.connect.id },
            select: { default_assignee_id: true, client_id: true }
        });
        if (campaign) {
            // If client link missing but campaign exists, link to campaign's client
            if (!((_f = (_e = createData.client) === null || _e === void 0 ? void 0 : _e.connect) === null || _f === void 0 ? void 0 : _f.id)) {
                createData.client = { connect: { id: campaign.client_id } };
            }
            // Auto-Assign if missing
            if (!((_h = (_g = createData.assignee) === null || _g === void 0 ? void 0 : _g.connect) === null || _h === void 0 ? void 0 : _h.id) && campaign.default_assignee_id) {
                createData.assignee = { connect: { id: campaign.default_assignee_id } };
            }
        }
    }
    // 2. SLA Calculation (If not provided manually)
    if (!createData.sla_target) {
        createData.sla_target = calculateSLA(createData.priority);
    }
    // 3. AI Estimation Stub (Random 30-180 mins for generic tasks)
    // Using 'any' cast to avoid TS error on new schema field if types aren't regenerated yet
    if (!createData.ai_estimated_minutes) {
        createData.ai_estimated_minutes = Math.floor(Math.random() * (180 - 30 + 1) + 30);
    }
    // 4. Set Initial SLA Status & Nature Default
    createData.sla_status = 'ON_TRACK';
    const task = yield prisma_1.default.task.create({
        data: createData,
        include: {
            assignee: { select: { id: true, full_name: true, avatar_url: true } },
            reporter: { select: { id: true, full_name: true, avatar_url: true } },
        }
    });
    if (task.assignee_id) {
        yield (0, service_1.createNotification)(task.assignee_id, 'TASK_ASSIGNED', `You have been assigned to task: ${task.title}`, `/dashboard/tasks/${task.id}`);
    }
    return task;
});
exports.createTask = createTask;
const getTasks = (filters) => __awaiter(void 0, void 0, void 0, function* () {
    const whereClause = {};
    if (filters.campaign_id)
        whereClause.campaign_id = filters.campaign_id;
    if (filters.assignee_id)
        whereClause.assignee_id = filters.assignee_id;
    if (filters.status)
        whereClause.status = filters.status;
    if (filters.priority)
        whereClause.priority = filters.priority;
    return yield prisma_1.default.task.findMany({
        where: whereClause,
        include: {
            assignee: { select: { id: true, full_name: true, avatar_url: true } },
            reporter: { select: { id: true, full_name: true, avatar_url: true } },
            campaign: { include: { client: true } }, // Include Client for display
            _count: { select: { comments: true, assets: true, sub_tasks: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
});
exports.getTasks = getTasks;
const getTaskById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.task.findUnique({
        where: { id },
        include: {
            assignee: { select: { id: true, full_name: true, avatar_url: true } },
            reporter: { select: { id: true, full_name: true, avatar_url: true } },
            campaign: { include: { client: true } },
            sub_tasks: true,
            dependencies: {
                include: { blocking_task: { select: { id: true, title: true, status: true } } }
            },
            dependents: {
                include: { blocked_task: { select: { id: true, title: true, status: true } } }
            },
            comments: {
                include: { author: { select: { id: true, full_name: true, avatar_url: true } } },
                orderBy: { createdAt: 'asc' }
            },
            assets: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });
});
exports.getTaskById = getTaskById;
const updateTask = (id, data) => __awaiter(void 0, void 0, void 0, function* () {
    // Automatic Timestamping Logic
    if (data.status) {
        if (data.status === 'IN_PROGRESS') {
            const current = yield prisma_1.default.task.findUnique({ where: { id }, select: { actual_start_date: true } });
            if (!(current === null || current === void 0 ? void 0 : current.actual_start_date)) {
                data.actual_start_date = new Date();
            }
        }
        if (data.status === 'COMPLETED') {
            data.completed_date = new Date();
        }
    }
    const existingTask = yield prisma_1.default.task.findUnique({ where: { id } });
    const updatedTask = yield prisma_1.default.task.update({
        where: { id },
        data,
        include: {
            assignee: { select: { id: true, full_name: true, avatar_url: true } },
        }
    });
    if (existingTask) {
        // Notify new assignee
        if (updatedTask.assignee_id && updatedTask.assignee_id !== existingTask.assignee_id) {
            yield (0, service_1.createNotification)(updatedTask.assignee_id, 'TASK_ASSIGNED', `You have been assigned to task: ${updatedTask.title}`, `/dashboard/tasks/${updatedTask.id}`);
        }
        // Notify reporter on status change
        if (updatedTask.status !== existingTask.status) {
            yield (0, service_1.createNotification)(updatedTask.reporter_id, 'TASK_UPDATED', `Task "${updatedTask.title}" is now ${updatedTask.status}`, `/dashboard/tasks/${updatedTask.id}`);
        }
    }
    return updatedTask;
});
exports.updateTask = updateTask;
const deleteTask = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.task.delete({
        where: { id }
    });
});
exports.deleteTask = deleteTask;
