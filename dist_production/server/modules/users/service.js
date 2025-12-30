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
exports.updateUser = exports.deleteUser = exports.getAllUsers = exports.findUserById = exports.findUserByEmail = exports.createUser = void 0;
const prisma_1 = __importDefault(require("../../utils/prisma"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const createUser = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const salt = yield bcryptjs_1.default.genSalt(10);
    const hashedPassword = yield bcryptjs_1.default.hash(data.password_hash, salt);
    const user = yield prisma_1.default.user.create({
        data: Object.assign(Object.assign({}, data), { password_hash: hashedPassword }),
    });
    // Auto-Create Ledger
    return user;
});
exports.createUser = createUser;
const findUserByEmail = (email) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.user.findUnique({
        where: { email },
    });
});
exports.findUserByEmail = findUserByEmail;
const findUserById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.user.findUnique({
        where: { id },
        select: {
            id: true,
            full_name: true,
            email: true,
            role: true,
            department: true,
            avatar_url: true,
        }
    });
});
exports.findUserById = findUserById;
const getAllUsers = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.user.findMany({
        select: {
            id: true,
            full_name: true,
            email: true,
            role: true,
            department: true,
            avatar_url: true,
        },
        orderBy: { createdAt: 'desc' }
    });
});
exports.getAllUsers = getAllUsers;
const deleteUser = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.user.delete({
        where: { id },
    });
});
exports.deleteUser = deleteUser;
const updateUser = (id, data) => __awaiter(void 0, void 0, void 0, function* () {
    if (data.password_hash) {
        const salt = yield bcryptjs_1.default.genSalt(10);
        data.password_hash = yield bcryptjs_1.default.hash(data.password_hash, salt);
    }
    return yield prisma_1.default.user.update({
        where: { id },
        data
    });
});
exports.updateUser = updateUser;
