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
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
function createBridgeUser() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const email = 'bridge@antigravity.com';
            const password = 'bridge_secure_password';
            // Check if exists
            const existing = yield prisma.user.findUnique({ where: { email } });
            if (existing) {
                console.log("Bridge user already exists.");
                return;
            }
            const salt = yield bcryptjs_1.default.genSalt(10);
            const passwordHash = yield bcryptjs_1.default.hash(password, salt);
            yield prisma.user.create({
                data: {
                    full_name: 'Biometric Bridge Agent',
                    email: email,
                    password_hash: passwordHash,
                    role: 'ADMIN',
                    department: 'IT'
                }
            });
            console.log(`Bridge user created: ${email}`);
        }
        catch (error) {
            console.error('Error creating bridge user:', error);
        }
        finally {
            yield prisma.$disconnect();
        }
    });
}
createBridgeUser();
