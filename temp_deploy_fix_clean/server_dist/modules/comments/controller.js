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
exports.getComments = exports.createComment = void 0;
const zod_1 = require("zod");
const commentService = __importStar(require("./service"));
const createCommentSchema = zod_1.z.object({
    content: zod_1.z.string().min(1),
    task_id: zod_1.z.string().uuid(),
    parent_comment_id: zod_1.z.string().uuid().optional(),
    is_revision_request: zod_1.z.boolean().default(false),
});
const createComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validatedData = createCommentSchema.parse(req.body);
        const comment = yield commentService.createComment(Object.assign({ content: validatedData.content, is_revision_request: validatedData.is_revision_request, task: { connect: { id: validatedData.task_id } }, author: { connect: { id: req.user.id } } }, (validatedData.parent_comment_id ? { parent_comment: { connect: { id: validatedData.parent_comment_id } } } : {})));
        res.status(201).json(comment);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError)
            res.status(400).json({ errors: error.errors });
        else
            res.status(500).json({ message: error.message });
    }
});
exports.createComment = createComment;
const getComments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { task_id } = req.query;
        if (!task_id)
            return res.status(400).json({ message: 'task_id is required' });
        const comments = yield commentService.getCommentsByTask(task_id);
        res.json(comments);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getComments = getComments;
