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
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeShare = exports.shareNote = exports.deleteTask = exports.updateTask = exports.addTask = exports.deleteNote = exports.updateNote = exports.createNote = exports.getNotes = void 0;
const StickyService = __importStar(require("./service"));
const zod_1 = require("zod");
const createNoteSchema = zod_1.z.object({
    title: zod_1.z.string().optional(),
    color: zod_1.z.string().optional(),
    position_x: zod_1.z.number().optional(),
    position_y: zod_1.z.number().optional()
});
const updateNoteSchema = zod_1.z.object({
    title: zod_1.z.string().optional(),
    color: zod_1.z.string().optional(),
    position_x: zod_1.z.number().optional(),
    position_y: zod_1.z.number().optional(),
    width: zod_1.z.number().optional(),
    height: zod_1.z.number().optional(),
    is_minimized: zod_1.z.boolean().optional(),
    is_visible: zod_1.z.boolean().optional()
});
const getNotes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const notes = yield StickyService.getNotes(userId);
        res.json(notes);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getNotes = getNotes;
const createNote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const data = createNoteSchema.parse(req.body);
        const note = yield StickyService.createNote(userId, data);
        res.status(201).json(note);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.createNote = createNote;
const updateNote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { id } = req.params;
        const data = updateNoteSchema.parse(req.body);
        const note = yield StickyService.updateNote(id, userId, data);
        res.json(note);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.updateNote = updateNote;
const deleteNote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { id } = req.params;
        yield StickyService.deleteNote(id, userId);
        res.json({ message: "Note deleted" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.deleteNote = deleteNote;
const addTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { noteId } = req.params;
        const { content } = req.body;
        if (!content)
            throw new Error("Content is required");
        const task = yield StickyService.addTask(userId, noteId, content);
        res.status(201).json(task);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.addTask = addTask;
const updateTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { taskId } = req.params;
        const task = yield StickyService.updateTask(userId, taskId, req.body);
        res.json(task);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.updateTask = updateTask;
const deleteTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { taskId } = req.params;
        yield StickyService.deleteTask(userId, taskId);
        res.json({ message: "Task deleted" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.deleteTask = deleteTask;
const shareNote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { id } = req.params;
        const { targetUserId, role } = req.body;
        const result = yield StickyService.shareNote(userId, id, targetUserId, role);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.shareNote = shareNote;
const removeShare = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { id } = req.params;
        const { targetUserId } = req.body;
        yield StickyService.removeShare(userId, id, targetUserId);
        res.json({ message: "Share removed" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
});
exports.removeShare = removeShare;
