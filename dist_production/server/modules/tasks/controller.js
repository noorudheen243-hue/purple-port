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
exports.deleteTask = exports.updateTask = exports.getTask = exports.getTasks = exports.createTask = void 0;
const zod_1 = require("zod");
const taskService = __importStar(require("./service"));
const createTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    campaign_id: zod_1.z.string().optional(),
    assignee_id: zod_1.z.string().optional(),
    client_id: zod_1.z.string().optional(), // Added
    category: zod_1.z.string().optional(), // Added
    nature: zod_1.z.string().optional(), // Added
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
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        if (isCreative(req))
            return res.status(403).json({ message: 'Creative team cannot create tasks.' });
        const validatedData = createTaskSchema.parse(req.body);
        const { assignee_id, campaign_id, client_id, due_date } = validatedData, otherData = __rest(validatedData, ["assignee_id", "campaign_id", "client_id", "due_date"]);
        const task = yield taskService.createTask(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, otherData), { reporter: { connect: { id: req.user.id } } }), (assignee_id ? { assignee: { connect: { id: assignee_id } } } : {})), (campaign_id ? { campaign: { connect: { id: campaign_id } } } : {})), (client_id ? { client: { connect: { id: client_id } } } : {})), { due_date: due_date ? new Date(due_date) : undefined }));
        res.status(201).json(task);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            res.status(400).json({ errors: error.errors });
        else
            res.status(500).json({ message: error.message });
    }
});
exports.createTask = createTask;
const getTasks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { campaign_id, assignee_id, status, priority } = req.query;
        const tasks = yield taskService.getTasks({
            campaign_id: campaign_id,
            assignee_id: assignee_id,
            status: status,
            priority: priority,
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
    try {
        if (isCreative(req)) {
            // Exception: Creative team MIGHT need to update status of their OWN task?
            // User said: "Except 'creative' team all other staffs can create, modify, and delete the task to others."
            // This implies Creative team CANNOT do general modifications.
            // Checking if they are just updating status? 
            // "modify... the task" usually covers everything. 
            // Safest interpretation: Block all modifications as per strict request.
            // If user complains they can't update status, I will relax it later.
            return res.status(403).json({ message: 'Creative team cannot modify tasks.' });
        }
        const validatedData = updateTaskSchema.parse(req.body);
        // Transform relations to Prisma Connect syntax
        const { assignee_id, campaign_id, client_id, due_date } = validatedData, rest = __rest(validatedData, ["assignee_id", "campaign_id", "client_id", "due_date"]);
        const updateData = Object.assign({}, rest);
        if (assignee_id)
            updateData.assignee = { connect: { id: assignee_id } };
        if (campaign_id)
            updateData.campaign = { connect: { id: campaign_id } };
        if (client_id)
            updateData.client = { connect: { id: client_id } };
        if (due_date)
            updateData.due_date = new Date(due_date);
        const task = yield taskService.updateTask(req.params.id, updateData);
        res.json(task);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            res.status(400).json({ errors: error.errors });
        else
            res.status(500).json({ message: error.message });
    }
});
exports.updateTask = updateTask;
const deleteTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (isCreative(req))
            return res.status(403).json({ message: 'Creative team cannot delete tasks.' });
        yield taskService.deleteTask(req.params.id);
        res.json({ message: 'Task deleted' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteTask = deleteTask;
