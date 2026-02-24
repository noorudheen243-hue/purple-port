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
exports.removeShare = exports.shareNote = exports.deleteTask = exports.updateTask = exports.addTask = exports.deleteNote = exports.updateNote = exports.getNotes = exports.createNote = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const createNote = (userId, data) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // Check limit? Maybe limit to 20 active notes to prevent spam.
    const count = yield prisma_1.default.stickyNote.count({ where: { user_id: userId, is_visible: true } });
    if (count > 50)
        throw new Error("Sticky Note limit reached. Please archive or delete old notes.");
    return yield prisma_1.default.stickyNote.create({
        data: {
            user: { connect: { id: userId } },
            title: data.title || "New Note",
            color: data.color || "#feff9c",
            position_x: (_a = data.position_x) !== null && _a !== void 0 ? _a : 50, // Default handled by DB usually, or here
            position_y: (_b = data.position_y) !== null && _b !== void 0 ? _b : 50,
        },
        include: { tasks: true, permissions: true }
    });
});
exports.createNote = createNote;
const getNotes = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    // Fetch owned notes OR shared notes
    return yield prisma_1.default.stickyNote.findMany({
        where: {
            OR: [
                { user_id: userId },
                { permissions: { some: { user_id: userId } } }
            ]
        },
        include: {
            tasks: { orderBy: { createdAt: 'asc' } },
            permissions: { include: { user: { select: { id: true, full_name: true, avatar_url: true } } } },
            user: { select: { id: true, full_name: true } } // Owner info
        },
        orderBy: { createdAt: 'asc' }
    });
});
exports.getNotes = getNotes;
const updateNote = (noteId, userId, data) => __awaiter(void 0, void 0, void 0, function* () {
    // Check permission
    const note = yield prisma_1.default.stickyNote.findUnique({ where: { id: noteId }, include: { permissions: true } });
    if (!note)
        throw new Error("Note not found");
    const isOwner = note.user_id === userId;
    const isEditor = note.permissions.some(p => p.user_id === userId && p.role === 'EDITOR');
    if (!isOwner && !isEditor)
        throw new Error("Permission denied");
    return yield prisma_1.default.stickyNote.update({
        where: { id: noteId },
        data,
        include: { tasks: true }
    });
});
exports.updateNote = updateNote;
const deleteNote = (noteId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const note = yield prisma_1.default.stickyNote.findUnique({ where: { id: noteId } });
    if (!note)
        throw new Error("Note not found");
    if (note.user_id !== userId)
        throw new Error("Only the owner can delete a note");
    return yield prisma_1.default.stickyNote.delete({ where: { id: noteId } });
});
exports.deleteNote = deleteNote;
// --- TASKS ---
const addTask = (userId, noteId, content) => __awaiter(void 0, void 0, void 0, function* () {
    // Check permission (Owner or Editor)
    const note = yield prisma_1.default.stickyNote.findUnique({ where: { id: noteId }, include: { permissions: true } });
    if (!note)
        throw new Error("Note not found");
    const canEdit = note.user_id === userId || note.permissions.some(p => p.user_id === userId && p.role === 'EDITOR');
    if (!canEdit)
        throw new Error("Permission denied");
    return yield prisma_1.default.stickyTask.create({
        data: {
            content,
            note: { connect: { id: noteId } }
        }
    });
});
exports.addTask = addTask;
const updateTask = (userId, taskId, data) => __awaiter(void 0, void 0, void 0, function* () {
    const task = yield prisma_1.default.stickyTask.findUnique({ where: { id: taskId }, include: { note: { include: { permissions: true } } } });
    if (!task)
        throw new Error("Task not found");
    const canEdit = task.note.user_id === userId || task.note.permissions.some(p => p.user_id === userId && p.role === 'EDITOR');
    if (!canEdit)
        throw new Error("Permission denied");
    const updateData = Object.assign({}, data);
    if (data.is_completed !== undefined) {
        updateData.completed_at = data.is_completed ? new Date() : null;
    }
    return yield prisma_1.default.stickyTask.update({
        where: { id: taskId },
        data: updateData
    });
});
exports.updateTask = updateTask;
const deleteTask = (userId, taskId) => __awaiter(void 0, void 0, void 0, function* () {
    const task = yield prisma_1.default.stickyTask.findUnique({ where: { id: taskId }, include: { note: { include: { permissions: true } } } });
    if (!task)
        throw new Error("Task not found");
    const canEdit = task.note.user_id === userId || task.note.permissions.some(p => p.user_id === userId && p.role === 'EDITOR');
    if (!canEdit)
        throw new Error("Permission denied");
    return yield prisma_1.default.stickyTask.delete({ where: { id: taskId } });
});
exports.deleteTask = deleteTask;
// --- SHARING ---
const shareNote = (ownerId, noteId, targetUserId, role) => __awaiter(void 0, void 0, void 0, function* () {
    const note = yield prisma_1.default.stickyNote.findUnique({ where: { id: noteId } });
    if (!note || note.user_id !== ownerId)
        throw new Error("Permission denied");
    if (ownerId === targetUserId)
        throw new Error("Cannot share with yourself");
    // Upsert permission
    return yield prisma_1.default.stickyNotePermission.upsert({
        where: { note_id_user_id: { note_id: noteId, user_id: targetUserId } },
        create: {
            note_id: noteId,
            user_id: targetUserId,
            role
        },
        update: {
            role
        }
    });
});
exports.shareNote = shareNote;
const removeShare = (ownerId, noteId, targetUserId) => __awaiter(void 0, void 0, void 0, function* () {
    const note = yield prisma_1.default.stickyNote.findUnique({ where: { id: noteId } });
    if (!note || note.user_id !== ownerId)
        throw new Error("Permission denied");
    return yield prisma_1.default.stickyNotePermission.delete({
        where: { note_id_user_id: { note_id: noteId, user_id: targetUserId } }
    });
});
exports.removeShare = removeShare;
