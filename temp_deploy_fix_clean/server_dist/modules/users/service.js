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
exports.findUserByIdWithPassword = exports.updateUserPassword = exports.updateUser = exports.deleteUser = exports.getAllUsers = exports.findUserById = exports.findUserByEmail = exports.createUser = void 0;
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
            linked_client_id: true,
        }
    });
});
exports.findUserById = findUserById;
const getAllUsers = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (includeHidden = false) {
    // Base Where: Always hide Bridge Agent
    const whereClause = {
        email: { not: 'bridge@antigravity.com' }
    };
    // If NOT asking for hidden users (default behavior for Dropdowns), apply strict filters
    if (!includeHidden) {
        whereClause.role = { not: 'CLIENT' }; // Exclude Clients
        whereClause.staffProfile = {
            staff_number: { notIn: ['QIX0001', 'QIX0002'] } // Exclude Co-founders
        };
    }
    return yield prisma_1.default.user.findMany({
        where: whereClause,
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
const updateUserPassword = (id, passwordHash) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.user.update({
        where: { id },
        data: { password_hash: passwordHash }
    });
});
exports.updateUserPassword = updateUserPassword;
const findUserByIdWithPassword = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma_1.default.user.findUnique({
        where: { id }
    });
});
exports.findUserByIdWithPassword = findUserByIdWithPassword;
