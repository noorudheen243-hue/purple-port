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
exports.getCommentsByTask = exports.createComment = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const createComment = (data) => __awaiter(void 0, void 0, void 0, function* () {
    // Transaction to create comment and potentially update task status
    return yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        const comment = yield tx.comment.create({
            data,
            include: {
                author: { select: { id: true, full_name: true, avatar_url: true } }
            }
        });
        if (comment.is_revision_request) {
            yield tx.task.update({
                where: { id: comment.task_id },
                data: { status: 'REVISION_REQUESTED' }
            });
        }
        return comment;
    }));
});
exports.createComment = createComment;
const getCommentsByTask = (taskId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.comment.findMany({
        where: { task_id: taskId },
        orderBy: { createdAt: 'asc' }, // Chronological
        include: {
            author: { select: { id: true, full_name: true, avatar_url: true } },
            replies: {
                include: {
                    author: { select: { id: true, full_name: true, avatar_url: true } }
                }
            }
        }
    });
});
exports.getCommentsByTask = getCommentsByTask;
