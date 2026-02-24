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
exports.approveAsset = exports.deleteAsset = exports.getAssetsByTask = exports.createAsset = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const createAsset = (data) => __awaiter(void 0, void 0, void 0, function* () {
    // Check for previous versions to increment version number
    const latestAsset = yield prisma_1.default.asset.findFirst({
        where: { task_id: data.task_id },
        orderBy: { version: 'desc' }
    });
    const version = latestAsset ? latestAsset.version + 1 : 1;
    return yield prisma_1.default.asset.create({
        data: Object.assign(Object.assign({}, data), { version })
    });
});
exports.createAsset = createAsset;
const getAssetsByTask = (taskId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.asset.findMany({
        where: { task_id: taskId },
        orderBy: { createdAt: 'desc' },
        include: {
            uploader: { select: { id: true, full_name: true, avatar_url: true } }
        }
    });
});
exports.getAssetsByTask = getAssetsByTask;
const deleteAsset = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const asset = yield prisma_1.default.asset.findUnique({ where: { id } });
    if (!asset)
        return null;
    // Delete file from disk
    const filePath = path_1.default.join(process.cwd(), asset.file_url); // file_url stored as 'uploads/filename...'
    if (fs_1.default.existsSync(filePath)) {
        fs_1.default.unlinkSync(filePath);
    }
    return yield prisma_1.default.asset.delete({ where: { id } });
});
exports.deleteAsset = deleteAsset;
const approveAsset = (id, is_approved) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.asset.update({
        where: { id },
        data: { is_approved }
    });
});
exports.approveAsset = approveAsset;
